import { Models } from "appwrite";
import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";

import { checkIsLiked } from "@/lib/utils";
import {
  useLikePost,
  useSavePost,
  useDeleteSavedPost,
  useGetCurrentUser,
  useGetUsersByIds,
} from "@/lib/react-query/queries";
import Loader from "@/components/shared/Loader";

type PostStatsProps = {
  post: Models.Document;
  userId: string;
  onCommentClick?: () => void;
  commentLink?: string;
  commentCount?: number;
};

const PostStats = ({
  post,
  userId,
  onCommentClick,
  commentLink,
  commentCount,
}: PostStatsProps) => {
  const location = useLocation();
  // Handle cases where post.likes can be:
  // - undefined
  // - array of strings (user id)
  // - array of documents (with $id)
  const likesList: string[] = Array.isArray(post.likes)
    ? (post.likes as any[])
        .filter((item) => item !== null && item !== undefined)
        .map((item) => {
          if (typeof item === "string") return item;
          if (typeof item === "object" && "$id" in item) {
            return (item as Models.Document).$id;
          }
          return "";
        })
        .filter((id) => id !== "")
    : [];

  const [likes, setLikes] = useState<string[]>(likesList);
  const [isSaved, setIsSaved] = useState(false);
  const [isLikesModalOpen, setIsLikesModalOpen] = useState(false);

  const { mutate: likePost } = useLikePost();
  const { mutate: savePost } = useSavePost();
  const { mutate: deleteSavePost } = useDeleteSavedPost();

  const { data: currentUser } = useGetCurrentUser();

  // Xử lý trường hợp currentUser hoặc currentUser.save/post có thể là undefined/null
  const savedPostRecord = currentUser?.save?.find((record: any) => {
    const recordPost = record?.post as Models.Document | null | undefined;
    return recordPost && recordPost.$id === post.$id;
  });

  useEffect(() => {
    setIsSaved(!!savedPostRecord);
  }, [currentUser, savedPostRecord]);

  // Cập nhật likes khi post.likes thay đổi
  useEffect(() => {
    if (Array.isArray(post.likes)) {
      const newLikesList: string[] = (post.likes as any[])
        .filter((item) => item !== null && item !== undefined)
        .map((item) => {
          if (typeof item === "string") return item;
          if (typeof item === "object" && "$id" in item) {
            return (item as Models.Document).$id;
          }
          return "";
        })
        .filter((id) => id !== "");
      setLikes(newLikesList);
    }
  }, [post.likes]);

  const handleLikePost = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    e.stopPropagation();

    let likesArray = [...likes];

    if (likesArray.includes(userId)) {
      likesArray = likesArray.filter((Id) => Id !== userId);
    } else {
      likesArray.push(userId);
    }

    setLikes(likesArray);
    likePost({ postId: post.$id, likesArray });
  };

  const handleSavePost = (
    e: React.MouseEvent<HTMLImageElement, MouseEvent>
  ) => {
    e.stopPropagation();

    if (savedPostRecord) {
      setIsSaved(false);
      return deleteSavePost(savedPostRecord.$id);
    }

    savePost({ userId: userId, postId: post.$id });
    setIsSaved(true);
  };

  const containerStyles = location.pathname.startsWith("/profile")
    ? "w-full"
    : "";

  const { data: likedUsers, isLoading: isLikedUsersLoading } =
    useGetUsersByIds(likes, isLikesModalOpen);

  const commentIcon = (
    <img
      src="/assets/icons/chat.svg"
      alt="comment"
      width={20}
      height={20}
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        if (onCommentClick) {
          onCommentClick();
        }
      }}
    />
  );

  return (
    <div
      className={`flex justify-between items-center z-20 ${containerStyles}`}>
      <div className="flex gap-4 items-center">
        {commentLink ? (
          <Link
            to={commentLink}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1">
            {commentIcon}
            {typeof commentCount === "number" && (
              <span className="small-medium lg:base-medium">
                {commentCount}
              </span>
            )}
          </Link>
        ) : (
          <div className="flex items-center gap-1">
            {commentIcon}
            {typeof commentCount === "number" && (
              <span className="small-medium lg:base-medium">
                {commentCount}
              </span>
            )}
          </div>
        )}

        <div className="flex gap-2 mr-5">
          <img
            src={`${
              checkIsLiked(likes, userId)
                ? "/assets/icons/liked.svg"
                : "/assets/icons/like.svg"
            }`}
            alt="like"
            width={20}
            height={20}
            onClick={(e) => handleLikePost(e)}
            className="cursor-pointer"
          />
          <button
            type="button"
            className="small-medium lg:base-medium text-light-1 hover:text-primary-500 transition"
            onClick={(e) => {
              e.stopPropagation();
              if (likes.length > 0) {
                setIsLikesModalOpen(true);
              }
            }}>
            {likes.length}
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <img
          src={isSaved ? "/assets/icons/saved.svg" : "/assets/icons/save.svg"}
          alt="share"
          width={20}
          height={20}
          className="cursor-pointer"
          onClick={(e) => handleSavePost(e)}
        />
      </div>
      {isLikesModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex-center z-50 px-4">
          <div className="bg-dark-3 rounded-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="h3-bold">Liked by</h3>
              <button
                onClick={() => setIsLikesModalOpen(false)}
                className="text-light-3 hover:text-light-1 transition"
                aria-label="Close">
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {isLikedUsersLoading ? (
                <div className="flex-center py-10">
                  <Loader />
                </div>
              ) : likedUsers && likedUsers.length > 0 ? (
                <ul className="flex flex-col gap-4">
                  {likedUsers.map((likedUser) => (
                    <li key={likedUser.$id}>
                      <Link
                        to={`/profile/${likedUser.$id}`}
                        className="flex items-center gap-3 hover:bg-dark-4 rounded-xl p-3 transition"
                        onClick={() => setIsLikesModalOpen(false)}>
                        <img
                          src={
                            likedUser.imageUrl ||
                            "/assets/icons/profile-placeholder.svg"
                          }
                          alt={likedUser.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                        <div className="flex flex-col">
                          <p className="body-semibold">{likedUser.name}</p>
                          <span className="text-light-3 text-sm">
                            @{likedUser.username}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-light-4 text-center py-6">
                  No likes yet.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostStats;
