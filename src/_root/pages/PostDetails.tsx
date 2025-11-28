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
} from "@/lib/react-query/queries";
import { multiFormatDateString } from "@/lib/utils";
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
  const [comment, setComment] = useState("");

  const relatedPosts = userPosts?.documents.filter(
    (userPost) => userPost.$id !== id
  );

  const mediaUrls =
    post?.imageUrls?.length > 0
      ? post.imageUrls
      : post?.imageUrl
      ? [post.imageUrl]
      : [];

  const comments = commentsData?.documents || [];

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
                {mediaUrls.map((url, index) => (
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
              ) : comments.length === 0 ? (
                <p className="text-light-4">Be the first to comment.</p>
              ) : (
                <ul className="flex flex-col gap-4">
                  {comments.map((commentItem: Models.Document) => {
                    const canDelete =
                      commentItem.user?.$id === user.id ||
                      post?.creator?.$id === user.id;
                    return (
                      <li
                        key={commentItem.$id}
                        className="flex gap-3 items-start border-b border-dark-4 pb-3">
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
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteComment(commentItem.$id)
                            }
                            className="text-light-4 hover:text-red-500">
                            <img
                              src="/assets/icons/delete.svg"
                              alt="delete comment"
                              width={18}
                              height={18}
                            />
                          </button>
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
