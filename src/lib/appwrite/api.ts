import { ID, Query, Models } from "appwrite";

import { appwriteConfig, account, databases, storage, avatars } from "./config";
import { IUpdatePost, INewPost, INewUser, IUpdateUser } from "@/types";

// ============================================================
// AUTH
// ============================================================

// ============================== SIGN UP
export async function createUserAccount(user: INewUser) {
  try {
    // Bước 1: Tạo account trong Appwrite
    const newAccount = await account.create(
      ID.unique(),
      user.email,
      user.password,
      user.name
    );

    if (!newAccount) throw Error;

    // Bước 2: Đăng nhập ngay để tạo session (cần thiết để có quyền tạo document)
    const session = await account.createEmailSession(user.email, user.password);
    
    if (!session) {
      throw new Error("Không thể tạo session sau khi đăng ký.");
    }

    // Bước 3: Bây giờ đã có session, lưu vào database
    const avatarUrl = avatars.getInitials(user.name);

    const newUser = await saveUserToDB({
      accountId: newAccount.$id,
      name: newAccount.name,
      email: newAccount.email,
      username: user.username,
      imageUrl: avatarUrl,
    });

    if (!newUser) {
      throw new Error("Không thể lưu thông tin user vào database. Vui lòng thử lại.");
    }

    return newUser;
  } catch (error: any) {
    // Xử lý lỗi cụ thể
    if (error?.code === 409) {
      throw new Error("Email đã được sử dụng. Vui lòng dùng email khác hoặc đăng nhập.");
    }
    if (error?.code === 401) {
      throw new Error("Không có quyền tạo user. Vui lòng kiểm tra permissions của collection 'users' trong Appwrite Console.");
    }
    // Nếu error đã có message, throw lại
    if (error?.message) {
      throw error;
    }
    console.error("Lỗi khi tạo tài khoản:", error);
    throw new Error("Đăng ký thất bại. Vui lòng thử lại.");
  }
}

// ============================== SAVE USER TO DB
export async function saveUserToDB(user: {
  accountId: string;
  email: string;
  name: string;
  imageUrl: URL;
  username?: string;
}) {
  try {
    const newUser = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      ID.unique(),
      user
    );

    if (!newUser) throw Error;

    return newUser;
  } catch (error: any) {
    console.error("Lỗi khi lưu user vào database:", error);
    // Throw error để createUserAccount có thể xử lý
    if (error?.code === 401) {
      throw new Error("Không có quyền tạo user. Vui lòng kiểm tra permissions của collection 'users' trong Appwrite Console.");
    }
    throw error;
  }
}

// ============================== SIGN IN
export async function signInAccount(user: { email: string; password: string }) {
  try {
    const session = await account.createEmailSession(user.email, user.password);

    return session;
  } catch (error: any) {
    console.error("Lỗi signInAccount:", error);

    // Appwrite: "Creation of a session is prohibited when a session is active."
    // Nghĩa là đã có session hiện tại -> coi như đăng nhập thành công
    if (
      typeof error?.message === "string" &&
      error.message.includes("Creation of a session is prohibited when a session is active")
    ) {
      try {
        const currentAccount = await getAccount();
        // Trả về bất cứ giá trị truthy nào để SigninForm coi là thành công
        return currentAccount || { status: "already_active_session" };
      } catch (innerError) {
        console.error("Lỗi khi lấy current account sau khi phát hiện session active:", innerError);
        return { status: "already_active_session" };
      }
    }

    // Các lỗi khác (sai email/password, v.v.) -> trả null để form hiển thị toast thất bại
    return null;
  }
}

// ============================== GET ACCOUNT
export async function getAccount() {
  try {
    const currentAccount = await account.get();
    return currentAccount;
  } catch (error: any) {
    // Lỗi 401 là bình thường khi user chưa đăng nhập, không cần log
    if (error?.code === 401 || error?.type === "general_unauthorized_scope") {
      return null;
    }
    // Chỉ log các lỗi khác
    console.log(error);
    return null;
  }
}

// ============================== GET USER
export async function getCurrentUser() {
  try {
    const currentAccount = await getAccount();

    if (!currentAccount) {
      return null;
    }

    const currentUser = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("accountId", currentAccount.$id)]
    );

  if (!currentUser || currentUser.documents.length === 0) {
    return null;
  }

  const user = currentUser.documents[0];

  const savedPosts = await databases.listDocuments(
    appwriteConfig.databaseId,
    appwriteConfig.savesCollectionId,
    [Query.equal("user", user.$id)]
  );

  const enrichedSaves = await enrichSavesWithPosts(savedPosts?.documents ?? []);

  return { ...user, save: enrichedSaves };
  } catch (error) {
    console.log(error);
    return null;
  }
}

// ============================== SIGN OUT
export async function signOutAccount() {
  try {
    const session = await account.deleteSession("current");

    return session;
  } catch (error) {
    console.log(error);
  }
}

// ============================================================
// POSTS
// ============================================================

// ============================== CREATE POST
export async function createPost(post: INewPost) {
  try {
    if (!post.file || post.file.length === 0) {
      throw new Error("Vui lòng chọn ít nhất một ảnh.");
    }

    const uploadedMedia: { imageId: string; imageUrl: string }[] = [];

    for (const file of post.file) {
      const uploadedFile = await uploadFile(file);

      if (!uploadedFile) throw Error;

      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      uploadedMedia.push({ imageId: uploadedFile.$id, imageUrl: fileUrl });
    }

    const imageIds = uploadedMedia.map((media) => media.imageId);
    const imageUrls = uploadedMedia.map((media) => media.imageUrl);

    // Upload file to appwrite storage
    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    // Create post
    const newPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      ID.unique(),
      {
        creator: post.userId,
        caption: post.caption,
        imageUrl: imageUrls[0],
        imageId: imageIds[0],
        imageUrls,
        imageIds,
        location: post.location,
        tags: tags,
      }
    );

    if (!newPost) {
      await Promise.all(imageIds.map((id) => deleteFile(id)));
      throw Error;
    }

    return newPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPLOAD FILE
export async function uploadFile(file: File) {
  try {
    const uploadedFile = await storage.createFile(
      appwriteConfig.storageId,
      ID.unique(),
      file
    );

    return uploadedFile;
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET FILE URL
// Sử dụng getFileView thay vì getFilePreview vì plan miễn phí không hỗ trợ image transformations
export function getFilePreview(fileId: string) {
  try {
    // Dùng getFileView() thay vì getFilePreview() vì plan miễn phí không hỗ trợ transformations
    const fileUrl = storage.getFileView(
      appwriteConfig.storageId,
      fileId
    );

    if (!fileUrl) throw Error;

    return fileUrl;
  } catch (error) {
    console.log(error);
    return null;
  }
}

// ============================== DELETE FILE
export async function deleteFile(fileId: string) {
  try {
    await storage.deleteFile(appwriteConfig.storageId, fileId);

    return { status: "ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== HELPERS: ENRICH POSTS WITH CREATOR DATA
async function enrichPostsWithCreators(documents: Models.Document[]) {
  try {
    const creatorIds = Array.from(
      new Set(
        documents
          .map((post) => {
            if (typeof post.creator === "string") {
              return post.creator;
            }

            if (post.creator && typeof post.creator === "object") {
              return post.creator.$id;
            }

            return null;
          })
          .filter(
            (id): id is string =>
              typeof id === "string" && id !== "undefined" && id !== "null"
          )
      )
    );

    if (!creatorIds.length) {
      return documents;
    }

    const creatorsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("$id", creatorIds)]
    );

    const creatorsMap =
      creatorsResponse?.documents.reduce(
        (acc, creator) => {
          acc[creator.$id] = creator;
          return acc;
        },
        {} as Record<string, Models.Document>
      ) ?? {};

    return documents.map((post) => {
      if (typeof post.creator === "string" && creatorsMap[post.creator]) {
        return { ...post, creator: creatorsMap[post.creator] };
      }
      return post;
    });
  } catch (error) {
    console.error("Lỗi khi gắn creator vào post:", error);
    return documents;
  }
}

async function enrichSavesWithPosts(documents: Models.Document[]) {
  if (!documents.length) return documents;

  try {
    const postIds = Array.from(
      new Set(
        documents
          .map((save) => {
            if (typeof save.post === "string") {
              return save.post;
            }

            if (save.post && typeof save.post === "object") {
              return (save.post as Models.Document).$id;
            }

            return null;
          })
          .filter(
            (id): id is string =>
              typeof id === "string" && id !== "undefined" && id !== "null"
          )
      )
    );

    if (!postIds.length) {
      return documents;
    }

    const postsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("$id", postIds)]
    );

    const enrichedPosts = await enrichPostsWithCreators(
      postsResponse?.documents ?? []
    );

    const postsMap = enrichedPosts.reduce(
      (acc, post) => {
        acc[post.$id] = post;
        return acc;
      },
      {} as Record<string, Models.Document>
    );

    return documents.map((save) => {
      if (typeof save.post === "string" && postsMap[save.post]) {
        return { ...save, post: postsMap[save.post] };
      }

      const postId =
        save.post && typeof save.post === "object"
          ? (save.post as Models.Document).$id
          : null;

      if (postId && postsMap[postId]) {
        return { ...save, post: postsMap[postId] };
      }

      return save;
    });
  } catch (error) {
    console.error("Lỗi khi gắn post vào save:", error);
    return documents;
  }
}

// ============================== GET POSTS
export async function searchPosts(searchTerm: string) {
  try {
    const postsResponse = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(200)]
    );

    if (!postsResponse) throw Error;

    const normalizedSearch = searchTerm.toLowerCase().trim();

    const filteredPosts = postsResponse.documents.filter((post) => {
      const caption = (post.caption || "").toLowerCase();

      let creatorName = "";
      let creatorUsername = "";

      if (typeof post.creator === "object" && post.creator !== null) {
        creatorName = (post.creator.name || "").toLowerCase();
        creatorUsername = (post.creator.username || "").toLowerCase();
      }

      return (
        caption.includes(normalizedSearch) ||
        creatorName.includes(normalizedSearch) ||
        creatorUsername.includes(normalizedSearch)
      );
    });

    const documents = await enrichPostsWithCreators(filteredPosts);

    return { documents };
  } catch (error) {
    console.log(error);
  }
}

export async function getInfinitePosts({ pageParam }: { pageParam: number }) {
  const queries: any[] = [Query.orderDesc("$updatedAt"), Query.limit(9)];

  if (pageParam) {
    queries.push(Query.cursorAfter(pageParam.toString()));
  }

  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      queries
    );

    if (!posts) throw Error;

    const documents = await enrichPostsWithCreators(posts.documents);

    return { ...posts, documents };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POST BY ID
export async function getPostById(postId?: string) {
  if (!postId) throw Error;

  try {
    const post = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!post) throw Error;

    const [enrichedPost] = await enrichPostsWithCreators([post]);

    return enrichedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== UPDATE POST
export async function updatePost(post: IUpdatePost) {
  const hasFileToUpdate = post.file.length > 0;

  try {
    let imageUrls = post.imageUrls || [];
    let imageIds = post.imageIds || [];

    if (hasFileToUpdate) {
      const uploadedMedia: { imageId: string; imageUrl: string }[] = [];

      for (const file of post.file) {
        const uploadedFile = await uploadFile(file);
        if (!uploadedFile) throw Error;

        const fileUrl = getFilePreview(uploadedFile.$id);
        if (!fileUrl) {
          await deleteFile(uploadedFile.$id);
          throw Error;
        }

        uploadedMedia.push({ imageId: uploadedFile.$id, imageUrl: fileUrl });
      }

      imageIds = uploadedMedia.map((media) => media.imageId);
      imageUrls = uploadedMedia.map((media) => media.imageUrl);
    }

    // Convert tags into array
    const tags = post.tags?.replace(/ /g, "").split(",") || [];

    //  Update post
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      post.postId,
      {
        caption: post.caption,
        imageUrl: imageUrls[0],
        imageId: imageIds[0],
        imageUrls,
        imageIds,
        location: post.location,
        tags: tags,
      }
    );

    // Failed to update
    if (!updatedPost) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate) {
        await Promise.all(imageIds.map((id) => deleteFile(id)));
      }

      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (hasFileToUpdate) {
      await Promise.all((post.imageIds || []).map((id) => deleteFile(id)));
    }

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== DELETE POST
export async function deletePost(postId?: string, imageIds: string[] = []) {
  if (!postId) return;

  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId
    );

    if (!statusCode) throw Error;

    await Promise.all(
      imageIds.map(async (id) => {
        if (id) {
          await deleteFile(id);
        }
      })
    );

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== LIKE / UNLIKE POST
export async function likePost(postId: string, likesArray: string[]) {
  try {
    const updatedPost = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      postId,
      {
        likes: likesArray,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}

// ============================== SAVE POST
export async function savePost(userId: string, postId: string) {
  try {
    const updatedPost = await databases.createDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      ID.unique(),
      {
        user: userId,
        post: postId,
      }
    );

    if (!updatedPost) throw Error;

    return updatedPost;
  } catch (error) {
    console.log(error);
  }
}
// ============================== DELETE SAVED POST
export async function deleteSavedPost(savedRecordId: string) {
  try {
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      appwriteConfig.savesCollectionId,
      savedRecordId
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error) {
    console.log(error);
  }
}

// ============================== FOLLOW USER
export async function followUser(followerId: string, followingId: string) {
  try {
    // Kiểm tra xem đã follow chưa
    const existingFollow = await databases.listDocuments(
      appwriteConfig.databaseId,
      "follows", // Collection ID cho follows
      [Query.equal("follower", followerId), Query.equal("following", followingId)]
    );

    if (existingFollow.documents.length > 0) {
      // Đã follow rồi, không làm gì
      return existingFollow.documents[0];
    }

    // Tạo follow record
    const followRecord = await databases.createDocument(
      appwriteConfig.databaseId,
      "follows",
      ID.unique(),
      {
        follower: followerId,
        following: followingId,
      }
    );

    if (!followRecord) throw Error;

    return followRecord;
  } catch (error: any) {
    if (error?.code === 404) {
      throw new Error("Collection 'follows' chưa được tạo. Vui lòng tạo collection 'follows' trong Appwrite Console. Xem file SETUP_FOLLOWS.md để biết chi tiết.");
    }
    console.error("Error following user:", error);
    throw error;
  }
}

// ============================== UNFOLLOW USER
export async function unfollowUser(followerId: string, followingId: string) {
  try {
    // Tìm follow record
    const existingFollow = await databases.listDocuments(
      appwriteConfig.databaseId,
      "follows",
      [Query.equal("follower", followerId), Query.equal("following", followingId)]
    );

    if (existingFollow.documents.length === 0) {
      // Chưa follow, không làm gì
      return { status: "Ok" };
    }

    // Xóa follow record
    const statusCode = await databases.deleteDocument(
      appwriteConfig.databaseId,
      "follows",
      existingFollow.documents[0].$id
    );

    if (!statusCode) throw Error;

    return { status: "Ok" };
  } catch (error: any) {
    if (error?.code === 404) {
      // Collection chưa tồn tại, coi như đã unfollow thành công
      return { status: "Ok" };
    }
    console.error("Error unfollowing user:", error);
    throw error;
  }
}

// ============================== GET FOLLOW RECORD
export async function getFollowRecord(followerId: string, followingId: string) {
  try {
    const followRecord = await databases.listDocuments(
      appwriteConfig.databaseId,
      "follows",
      [Query.equal("follower", followerId), Query.equal("following", followingId)]
    );

    return followRecord.documents.length > 0 ? followRecord.documents[0] : null;
  } catch (error: any) {
    // Collection chưa tồn tại (404) hoặc lỗi khác - không log để tránh spam console
    if (error?.code === 404) {
      // Collection "follows" chưa được tạo, return null
      return null;
    }
    // Chỉ log các lỗi khác
    console.error("Error getting follow record:", error);
    return null;
  }
}

// ============================== GET FOLLOWERS COUNT
export async function getFollowersCount(userId: string) {
  try {
    // Đếm số lượng user follow userId này (following = userId)
    const followers = await databases.listDocuments(
      appwriteConfig.databaseId,
      "follows",
      [Query.equal("following", userId)]
    );

    return followers.total || 0;
  } catch (error: any) {
    // Collection chưa tồn tại (404) - return 0
    if (error?.code === 404) {
      return 0;
    }
    console.error("Error getting followers count:", error);
    return 0;
  }
}

// ============================== GET FOLLOWING COUNT
export async function getFollowingCount(userId: string) {
  try {
    // Đếm số lượng user mà userId này đang follow (follower = userId)
    const following = await databases.listDocuments(
      appwriteConfig.databaseId,
      "follows",
      [Query.equal("follower", userId)]
    );

    return following.total || 0;
  } catch (error: any) {
    // Collection chưa tồn tại (404) - return 0
    if (error?.code === 404) {
      return 0;
    }
    console.error("Error getting following count:", error);
    return 0;
  }
}

// ============================== GET USER'S POST
export async function getUserPosts(userId?: string) {
  if (!userId) return;

  try {
    const post = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.equal("creator", userId), Query.orderDesc("$createdAt")]
    );

    if (!post) throw Error;

    const documents = await enrichPostsWithCreators(post.documents);

    return { ...post, documents };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET POPULAR POSTS (BY HIGHEST LIKE COUNT)
export async function getRecentPosts() {
  try {
    const posts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc("$createdAt"), Query.limit(20)]
    );

    if (!posts) throw Error;

    const documents = await enrichPostsWithCreators(posts.documents);

    return { ...posts, documents };
  } catch (error) {
    console.log(error);
  }
}

// ============================== GET FOLLOWERS LIST
export async function getFollowersList(userId: string) {
  if (!userId) return [];

  try {
    const followersRecords = await databases.listDocuments(
      appwriteConfig.databaseId,
      "follows",
      [Query.equal("following", userId)]
    );

    if (!followersRecords || followersRecords.documents.length === 0) {
      return [];
    }

    const followerIds = followersRecords.documents
      .map((record) => {
        if (typeof record.follower === "string") return record.follower;
        if (
          record.follower &&
          typeof record.follower === "object" &&
          "$id" in record.follower
        ) {
          return record.follower.$id as string;
        }
        return null;
      })
      .filter((id): id is string => !!id);

    if (followerIds.length === 0) {
      return [];
    }

    const followers = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("$id", followerIds)]
    );

    return followers?.documents ?? [];
  } catch (error: any) {
    if (error?.code !== 404) {
      console.error("Lỗi khi lấy danh sách followers:", error);
    }
    return [];
  }
}

// ============================== GET FOLLOWING LIST
export async function getFollowingList(userId: string) {
  if (!userId) return [];

  try {
    const followingRecords = await databases.listDocuments(
      appwriteConfig.databaseId,
      "follows",
      [Query.equal("follower", userId)]
    );

    if (!followingRecords || followingRecords.documents.length === 0) {
      return [];
    }

    const followingIds = followingRecords.documents
      .map((record) => {
        if (typeof record.following === "string") return record.following;
        if (
          record.following &&
          typeof record.following === "object" &&
          "$id" in record.following
        ) {
          return record.following.$id as string;
        }
        return null;
      })
      .filter((id): id is string => !!id);

    if (followingIds.length === 0) {
      return [];
    }

    const following = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [Query.equal("$id", followingIds)]
    );

    return following?.documents ?? [];
  } catch (error: any) {
    if (error?.code !== 404) {
      console.error("Lỗi khi lấy danh sách following:", error);
    }
    return [];
  }
}

// ============================== GET LIKED POSTS
export async function getLikedPosts(userId: string) {
  if (!userId) return { documents: [] };

  try {
    // Lấy tất cả posts
    const allPosts = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.postCollectionId,
      [Query.orderDesc("$createdAt")]
    );

    if (!allPosts) return { documents: [] };

    // Filter các posts có userId trong likes array
    const likedPosts = allPosts.documents.filter((post) => {
      if (!Array.isArray(post.likes)) return false;
      return post.likes.some((like: any) => {
        if (typeof like === "string") return like === userId;
        if (typeof like === "object" && like?.$id) return like.$id === userId;
        return false;
      });
    });

    // Enrich với creator data
    const enrichedPosts = await enrichPostsWithCreators(likedPosts);

    return { documents: enrichedPosts };
  } catch (error) {
    console.error("Lỗi khi lấy liked posts:", error);
    return { documents: [] };
  }
}

// ============================================================
// USER
// ============================================================

// ============================== GET USERS
export async function getUsers(params?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const { page = 1, limit = 9, search = "" } = params ?? {};
  const offset = (page - 1) * limit;

  try {
    // Nếu có search term, lấy nhiều user rồi filter thủ công để tránh yêu cầu fulltext index
    if (search) {
      const searchResponse = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.userCollectionId,
        [Query.orderDesc("$createdAt"), Query.limit(200)]
      );

      const normalizedSearch = search.toLowerCase();
      const filteredUsers =
        searchResponse?.documents.filter((user: Models.Document) => {
          const name = (user.name || "").toLowerCase();
          const username = (user.username || "").toLowerCase();
          return (
            name.includes(normalizedSearch) || username.includes(normalizedSearch)
          );
        }) ?? [];

      const paginatedUsers = filteredUsers.slice(offset, offset + limit);

      return {
        total: filteredUsers.length,
        documents: paginatedUsers,
      };
    }

    const users = await databases.listDocuments(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      [
        Query.orderDesc("$createdAt"),
        Query.limit(limit),
        Query.offset(offset),
      ]
    );

    if (!users) {
      throw new Error("Không lấy được danh sách users");
    }

    return users;
  } catch (error: any) {
    console.error("Lỗi getUsers:", error);

    // Ném lỗi rõ ràng cho React Query, tránh trả về undefined
    if (error?.code === 401 || error?.type === "general_unauthorized_scope") {
      throw new Error(
        "Không có quyền xem danh sách users. Vui lòng kiểm tra lại Appwrite (Project ID, Database ID, Collection ID, Permissions)."
      );
    }

    // Nếu Appwrite trả lỗi khác, ném lại để React Query set isError
    if (error?.message) {
      throw error;
    }

    throw new Error("Đã xảy ra lỗi khi lấy danh sách users");
  }
}

// ============================== GET USER BY ID
export async function getUserById(userId: string) {
  try {
    if (!userId || userId === "undefined" || userId === "null") {
      throw new Error("userId không hợp lệ khi getUserById");
    }

    const user = await databases.getDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      userId
    );

    if (!user) {
      throw new Error("Không tìm thấy user với ID đã cung cấp");
    }

    return user;
  } catch (error: any) {
    console.error("Lỗi getUserById:", error);
    throw error;
  }
}

// ============================== UPDATE USER
export async function updateUser(user: IUpdateUser) {
  const hasFileToUpdate = user.file.length > 0;
  try {
    let image = {
      imageUrl: user.imageUrl,
      imageId: user.imageId,
    };

    if (hasFileToUpdate) {
      // Upload new file to appwrite storage
      const uploadedFile = await uploadFile(user.file[0]);
      if (!uploadedFile) throw Error;

      // Get new file url
      const fileUrl = getFilePreview(uploadedFile.$id);
      if (!fileUrl) {
        await deleteFile(uploadedFile.$id);
        throw Error;
      }

      image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
    }

    // Chuẩn bị data để update - chỉ thêm imageId nếu có giá trị
    const updateData: any = {
      name: user.name,
      bio: user.bio,
      imageUrl: image.imageUrl,
    };

    // Chỉ thêm imageId nếu có giá trị (có file mới hoặc đã có imageId)
    if (image.imageId) {
      updateData.imageId = image.imageId;
    }

    //  Update user
    const updatedUser = await databases.updateDocument(
      appwriteConfig.databaseId,
      appwriteConfig.userCollectionId,
      user.userId,
      updateData
    );

    // Failed to update
    if (!updatedUser) {
      // Delete new file that has been recently uploaded
      if (hasFileToUpdate && image.imageId) {
        await deleteFile(image.imageId);
      }
      // If no new file uploaded, just throw error
      throw Error;
    }

    // Safely delete old file after successful update
    if (user.imageId && hasFileToUpdate) {
      await deleteFile(user.imageId);
    }

    return updatedUser;
  } catch (error: any) {
    console.error("Error updating user:", error);
    // Nếu lỗi do attribute không tồn tại, thử update lại không có imageId
    if (error?.code === 400 && error?.message?.includes("imageId")) {
      try {
        const hasFileToUpdate = user.file.length > 0;
        let imageUrl = user.imageUrl;
        
        // Nếu có file mới, vẫn cần upload và lấy URL
        if (hasFileToUpdate) {
          const uploadedFile = await uploadFile(user.file[0]);
          if (uploadedFile) {
            const fileUrl = getFilePreview(uploadedFile.$id);
            if (fileUrl) {
              imageUrl = fileUrl;
            }
          }
        }

        const updatedUser = await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          user.userId,
          {
            name: user.name,
            bio: user.bio,
            imageUrl: imageUrl,
            // Không gửi imageId vì attribute chưa tồn tại
          }
        );
        return updatedUser;
      } catch (retryError) {
        console.error("Error retrying update without imageId:", retryError);
        throw retryError;
      }
    }
    throw error;
  }
}
