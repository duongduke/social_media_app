import { Models } from "appwrite";
import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";

import { Button, Textarea } from "@/components/ui";
import { Loader } from "@/components/shared";
import { GridPostList, PostStats } from "@/components/shared";

import {
  useGetPostById,
  useGetUserPosts,
  useDeletePost,
  useGetComments,
  useCreateComment,
  useDeleteComment,
  useLikeComment,
  useGetUsersByIds,
} from "@/lib/react-query/queries";
import { multiFormatDateString, checkIsLiked } from "@/lib/utils";
import { useUserContext } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const PostDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useUserContext();
  const commentsRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const { data: post, isLoading } = useGetPostById(id);
  const { data: userPosts, isLoading: isUserPostLoading } = useGetUserPosts(
    post?.creator?.$id
  );
  const { mutate: deletePost } = useDeletePost();
  const {
    data: commentsData,
    isLoading: isCommentsLoading,
  } = useGetComments(post?.$id);
  const { mutateAsync: addComment, isLoading: isAddingComment } =
    useCreateComment();
  const { mutate: removeComment } = useDeleteComment();
  const { mutate: toggleLikeComment } = useLikeComment();
  const [comment, setComment] = useState("");
  const [reply, setReply] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [likesModalOpen, setLikesModalOpen] = useState(false);
  const [selectedLikeUserIds, setSelectedLikeUserIds] = useState<string[]>([]);

  const { data: likedUsers, isLoading: isLikedUsersLoading } = useGetUsersByIds(
    selectedLikeUserIds,
    likesModalOpen
  );

  const relatedPosts = userPosts?.documents.filter(
    (userPost: Models.Document) => userPost.$id !== id
  );

  const mediaUrls =
    post?.imageUrls?.length && post.imageUrls.length > 0
      ? post.imageUrls
      : post?.imageUrl
      ? [post.imageUrl]
      : [];

  const comments = commentsData?.documents || [];

  const rootComments = comments.filter(
    (c: any) => !c.parentComment || c.parentComment === null
  );

  const repliesByParent: Record<string, Models.Document[]> = {};
  comments.forEach((c: any) => {
    if (c.parentComment) {
      if (!repliesByParent[c.parentComment]) {
        repliesByParent[c.parentComment] = [];
      }
      repliesByParent[c.parentComment].push(c);
    }
  });

  const handleAddComment = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();
    if (!post || !comment.trim()) return;

    try {
      await addComment({
        postId: post.$id,
        userId: user.id,
        content: comment.trim(),
      });
      setComment("");
      commentsRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (error: any) {
      toast({
        title: "Failed to add comment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteComment = (commentId: string) => {
    if (!post) return;
    removeComment({ commentId, postId: post.$id });
  };

  const handleToggleLikeComment = (
    commentId: string,
    currentLikes: any[] | undefined
  ) => {
    if (!post) return;

    const likeIds: string[] = Array.isArray(currentLikes)
      ? currentLikes
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

    let newLikes = [...likeIds];

    if (newLikes.includes(user.id)) {
      newLikes = newLikes.filter((id) => id !== user.id);
    } else {
      newLikes.push(user.id);
    }

    toggleLikeComment({ commentId, likesArray: newLikes, postId: post.$id });
  };

  const handleStartReply = (commentId: string) => {
    setReplyingTo(commentId);
    setReply("");
  };

  const handleAddReply = async (
    e: React.FormEvent<HTMLFormElement>,
    parentCommentId: string
  ) => {
    e.preventDefault();
    if (!post || !reply.trim()) return;

    try {
      await addComment({
        postId: post.$id,
        userId: user.id,
        content: reply.trim(),
        parentCommentId,
      });
      setReply("");
      setReplyingTo(null);
    } catch (error: any) {
      toast({
        title: "Failed to add reply. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [post?.$id]);

  const handleDeletePost = () => {
    deletePost({
      postId: id,
      imageIds: post?.imageIds || (post?.imageId ? [post.imageId] : []),
    });
    navigate(-1);
  };

  return (
    <div className="post_details-container">
      <div className="hidden md:flex max-w-5xl w-full">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="shad-button_ghost">
          <img
            src={"/assets/icons/back.svg"}
            alt="back"
            width={24}
            height={24}
          />
          <p className="small-medium lg:base-medium">Back</p>
        </Button>
      </div>

      {isLoading ? (
        <Loader />
      ) : !post ? (
        <div className="flex-center w-full h-full">
            <p className="body-bold text-light-1">Post not found</p>
        </div>
      ) : (
        <div className="post_details-card">
          <div className="post_details-media">
            {mediaUrls.length > 0 && (
              <img
                src={mediaUrls[activeMediaIndex]}
                alt="post media"
                className="post_details-img"
              />
            )}
            {mediaUrls.length > 1 && (
              <div className="flex gap-3 overflow-x-auto custom-scrollbar">
                {mediaUrls.map((url: string, index: number) => (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    onClick={() => setActiveMediaIndex(index)}
                    className={`w-20 h-20 rounded-lg border ${
                      activeMediaIndex === index
                        ? "border-primary-500"
                        : "border-dark-4"
                    }`}
                  >
                    <img
                      src={url}
                      alt={`thumb-${index}`}
                      className="object-cover w-full h-full rounded-lg"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="post_details-info">
            <div className="flex-between w-full">
              <Link
                to={`/profile/${post?.creator?.$id}`}
                className="flex items-center gap-3">
                <img
                  src={
                    post?.creator?.imageUrl ||
                    "/assets/icons/profile-placeholder.svg"
                  }
                  alt="creator"
                  className="w-8 h-8 lg:w-12 lg:h-12 rounded-full"
                />
                <div className="flex gap-1 flex-col">
                  <p className="base-medium lg:body-bold text-light-1">
                    {post?.creator?.name}
                  </p>
                  <div className="flex-center gap-2 text-light-3">
                    <p className="subtle-semibold lg:small-regular ">
                      {multiFormatDateString(post?.$createdAt)}
                    </p>
                    •
                    <p className="subtle-semibold lg:small-regular">
                      {post?.location}
                    </p>
                  </div>
                </div>
              </Link>

              <div className="flex-center gap-4">
                <Link
                  to={`/update-post/${post?.$id}`}
                  className={`${user.id !== post?.creator?.$id && "hidden"}`}>
                  <img
                    src={"/assets/icons/edit.svg"}
                    alt="edit"
                    width={24}
                    height={24}
                  />
                </Link>

                <Button
                  onClick={handleDeletePost}
                  variant="ghost"
                  className={`ost_details-delete_btn ${
                    user.id !== post?.creator?.$id && "hidden"
                  }`}>
                  <img
                    src={"/assets/icons/delete.svg"}
                    alt="delete"
                    width={24}
                    height={24}
                  />
                </Button>
              </div>
            </div>

            <hr className="border w-full border-dark-4/80" />

            <div className="flex flex-col flex-1 w-full small-medium lg:base-regular">
              <p>{post?.caption}</p>
              {post?.tags && (
                <ul className="flex gap-1 mt-2">
                  {post.tags.map((tag: string, index: string) => (
                    <li
                      key={`${tag}${index}`}
                      className="text-light-3 small-regular">
                      #{tag}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="w-full">
      <PostStats
        post={post}
        userId={user.id}
        commentCount={comments.length || post?.commentsCount}
        onCommentClick={() =>
          commentsRef.current?.scrollIntoView({ behavior: "smooth" })
        }
      />
            </div>

            <div
              ref={commentsRef}
              id="comments"
              className="w-full flex flex-col gap-4 mt-4">
              <h4 className="body-bold">Comments</h4>
              <form
                onSubmit={handleAddComment}
                className="flex flex-col gap-3 w-full">
                <Textarea
                  placeholder="Write your comment..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="shad-textarea custom-scrollbar"
                />
                <Button
                  type="submit"
                  className="shad-button_primary self-end"
                  disabled={isAddingComment}>
                  {isAddingComment && <Loader />}
                  Comment
                </Button>
              </form>

              {isCommentsLoading ? (
                <Loader />
              ) : rootComments.length === 0 ? (
                <p className="text-light-4">Be the first to comment.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {rootComments.map((commentItem: Models.Document) => {
                    const canDelete =
                      commentItem.user?.$id === user.id ||
                      post?.creator?.$id === user.id;
                    const commentLikes: any[] = commentItem.likes || [];
                    const commentLikeIds: string[] = Array.isArray(commentLikes)
                      ? commentLikes
                          .filter(
                            (item) => item !== null && item !== undefined
                          )
                          .map((item) => {
                            if (typeof item === "string") return item;
                            if (
                              typeof item === "object" &&
                              "$id" in item
                            ) {
                              return (item as Models.Document).$id || "";
                            }
                            return "";
                          })
                          .filter((id) => id !== "")
                      : [];
                    const commentLikeCount = commentLikeIds.length;
                    const isCommentLikedByUser = checkIsLiked(
                      commentLikeIds,
                      user.id
                    );
                    const replies = repliesByParent[commentItem.$id] || [];
                    return (
                      <li
                        key={commentItem.$id}
                        className="flex flex-col gap-2 border-b border-dark-4 pb-3">
                        <div className="flex gap-3 items-start">
                          <img
                            src={
                              commentItem.user?.imageUrl ||
                              "/assets/icons/profile-placeholder.svg"
                            }
                            alt={commentItem.user?.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Link
                                to={`/profile/${commentItem.user?.$id}`}
                                className="body-semibold hover:text-primary-500">
                                {commentItem.user?.name}
                              </Link>
                              <span className="text-light-4 text-sm">
                                {multiFormatDateString(
                                  commentItem.$createdAt
                                )}
                              </span>
                            </div>
                            <p className="text-light-2">
                              {commentItem.content}
                            </p>
                            <div className="flex items-center gap-4 mt-1 text-sm text-light-4">
                              <button
                                type="button"
                                onClick={() =>
                                  handleStartReply(commentItem.$id)
                                }
                                className="hover:text-primary-500">
                                Reply
                              </button>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleLikeComment(
                                      commentItem.$id,
                                      commentItem.likes
                                    )
                                  }
                                  className="hover:text-primary-500 flex items-center gap-1"
                                >
                                  <img
                                    src={
                                      isCommentLikedByUser
                                        ? "/assets/icons/liked.svg"
                                        : "/assets/icons/like.svg"
                                    }
                                    alt="like comment"
                                    width={14}
                                    height={14}
                                  />
                                  <span>Like</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={commentLikeCount === 0}
                                  onClick={() => {
                                    const ids =
                                      (commentItem.likes as any[]) || [];
                                    const likeIds: string[] = Array.isArray(
                                      ids
                                    )
                                      ? ids
                                          .filter(
                                            (item) =>
                                              item !== null &&
                                              item !== undefined
                                          )
                                          .map((item) => {
                                            if (typeof item === "string")
                                              return item;
                                            if (
                                              typeof item === "object" &&
                                              "$id" in item
                                            ) {
                                              return (
                                                (item as Models.Document).$id ||
                                                ""
                                              );
                                            }
                                            return "";
                                          })
                                          .filter((id) => id !== "")
                                      : [];

                                    setSelectedLikeUserIds(likeIds);
                                    setLikesModalOpen(true);
                                  }}
                                  className="text-light-3 hover:text-primary-500 disabled:opacity-50 disabled:cursor-default"
                                >
                                  {commentLikeCount}
                                </button>
                              </div>
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDeleteComment(commentItem.$id)
                                  }
                                  className="hover:text-red-500 flex items-center gap-1">
                                  <img
                                    src="/assets/icons/delete.svg"
                                    alt="delete comment"
                                    width={16}
                                    height={16}
                                  />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Reply list */}
                        {replies.length > 0 && (
                          <ul className="mt-2 ml-10 flex flex-col gap-3 border-l border-dark-4 pl-4">
                            {replies.map((replyItem: Models.Document) => {
                              const canDeleteReply =
                                replyItem.user?.$id === user.id ||
                                post?.creator?.$id === user.id;
                              const replyLikes: any[] = replyItem.likes || [];
                              const replyLikeIds: string[] = Array.isArray(
                                replyLikes
                              )
                                ? replyLikes
                                    .filter(
                                      (item) =>
                                        item !== null && item !== undefined
                                    )
                                    .map((item) => {
                                      if (typeof item === "string") return item;
                                      if (
                                        typeof item === "object" &&
                                        "$id" in item
                                      ) {
                                        return (
                                          (item as Models.Document).$id || ""
                                        );
                                      }
                                      return "";
                                    })
                                    .filter((id) => id !== "")
                                : [];
                              const replyLikeCount = replyLikeIds.length;
                              const isReplyLikedByUser = checkIsLiked(
                                replyLikeIds,
                                user.id
                              );
                              return (
                                <li
                                  key={replyItem.$id}
                                  className="flex gap-3 items-start">
                                  <img
                                    src={
                                      replyItem.user?.imageUrl ||
                                      "/assets/icons/profile-placeholder.svg"
                                    }
                                    alt={replyItem.user?.name}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <Link
                                        to={`/profile/${replyItem.user?.$id}`}
                                        className="body-semibold hover:text-primary-500">
                                        {replyItem.user?.name}
                                      </Link>
                                      <span className="text-light-4 text-sm">
                                        {multiFormatDateString(
                                          replyItem.$createdAt
                                        )}
                                      </span>
                                    </div>
                                    <p className="text-light-2">
                                      {replyItem.content}
                                    </p>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-light-4">
                                      <div className="flex items-center gap-1">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleToggleLikeComment(
                                              replyItem.$id,
                                              replyItem.likes
                                            )
                                          }
                                          className="hover:text-primary-500 flex items-center gap-1"
                                        >
                                          <img
                                            src={
                                              isReplyLikedByUser
                                                ? "/assets/icons/liked.svg"
                                                : "/assets/icons/like.svg"
                                            }
                                            alt="like reply"
                                            width={12}
                                            height={12}
                                          />
                                          <span>Like</span>
                                        </button>
                                        <button
                                          type="button"
                                          disabled={replyLikeCount === 0}
                                          onClick={() => {
                                            const ids =
                                              (replyItem.likes as any[]) || [];
                                            const likeIds: string[] =
                                              Array.isArray(ids)
                                                ? ids
                                                    .filter(
                                                      (item) =>
                                                        item !== null &&
                                                        item !== undefined
                                                    )
                                                    .map((item) => {
                                                      if (
                                                        typeof item === "string"
                                                      )
                                                        return item;
                                                      if (
                                                        typeof item ===
                                                          "object" &&
                                                        "$id" in item
                                                      ) {
                                                        return (
                                                          (item as Models.Document)
                                                            .$id || ""
                                                        );
                                                      }
                                                      return "";
                                                    })
                                                    .filter((id) => id !== "")
                                                : [];

                                            setSelectedLikeUserIds(likeIds);
                                            setLikesModalOpen(true);
                                          }}
                                          className="text-light-3 hover:text-primary-500 disabled:opacity-50 disabled:cursor-default"
                                        >
                                          {replyLikeCount}
                                        </button>
                                      </div>
                                      {canDeleteReply && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteComment(replyItem.$id)
                                          }
                                          className="text-light-4 hover:text-red-500 flex items-center gap-1"
                                        >
                                          <img
                                            src="/assets/icons/delete.svg"
                                            alt="delete reply"
                                            width={14}
                                            height={14}
                                          />
                                          <span>Delete</span>
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {/* Reply form */}
                        {replyingTo === commentItem.$id && (
                          <form
                            onSubmit={(e) => handleAddReply(e, commentItem.$id)}
                            className="mt-2 ml-10 flex flex-col gap-2">
                            <Textarea
                              placeholder="Write your reply..."
                              value={reply}
                              onChange={(e) => setReply(e.target.value)}
                              className="shad-textarea custom-scrollbar min-h-[60px]"
                            />
                            <div className="flex gap-2 justify-end">
                              <Button
                                type="button"
                                variant="ghost"
                                className="px-3 py-1"
                                onClick={() => {
                                  setReplyingTo(null);
                                  setReply("");
                                }}>
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                className="shad-button_primary px-3 py-1">
                                Reply
                              </Button>
                            </div>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {likesModalOpen && (
        <div className="fixed inset-0 bg-black/70 flex-center z-50 px-4">
          <div className="bg-dark-3 rounded-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="h3-bold">Liked by</h3>
              <button
                onClick={() => {
                  setLikesModalOpen(false);
                  setSelectedLikeUserIds([]);
                }}
                className="text-light-3 hover:text-light-1 transition"
                aria-label="Close"
              >
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
                  {likedUsers.map((likedUser: any) => (
                    <li key={likedUser.$id}>
                      <Link
                        to={`/profile/${likedUser.$id}`}
                        className="flex items-center gap-3 hover:bg-dark-4 rounded-xl p-3 transition"
                        onClick={() => {
                          setLikesModalOpen(false);
                          setSelectedLikeUserIds([]);
                        }}
                      >
                        <img
                          src={
                            likedUser.imageUrl ||
                            "/assets/icons/profile-placeholder.svg"
                          }
                          alt={likedUser.name}
                          className="w-10 h-10 rounded-full object-cover"
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

      <div className="w-full max-w-5xl">
        <hr className="border w-full border-dark-4/80" />

        <h3 className="body-bold md:h3-bold w-full my-10">
          More Related Posts
        </h3>
        {isUserPostLoading || !relatedPosts ? (
          <Loader />
        ) : (
          <GridPostList posts={relatedPosts} />
        )}
      </div>
    </div>
  );
};

export default PostDetails;
