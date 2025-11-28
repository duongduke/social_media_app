import { Models } from "appwrite";
import { Link } from "react-router-dom";

import { PostStats } from "@/components/shared";
import { multiFormatDateString } from "@/lib/utils";
import { useUserContext } from "@/context/AuthContext";
import { useGetComments } from "@/lib/react-query/queries";

type PostCardProps = {
  post: Models.Document;
};

const PostCard = ({ post }: PostCardProps) => {
  const { user } = useUserContext();
  const { data: commentsData } = useGetComments(post.$id);

  if (!post.creator) return;

  const commentCount = commentsData?.documents?.length ?? 0;

  const mediaUrls =
    post.imageUrls?.length > 0
      ? post.imageUrls
      : post.imageUrl
      ? [post.imageUrl]
      : [];
  const mainImage =
    mediaUrls[0] || "/assets/icons/profile-placeholder.svg";

  return (
    <div className="post-card">
      <div className="flex-between">
        <div className="flex items-center gap-3">
          <Link to={`/profile/${post.creator.$id}`}>
            <img
              src={
                post.creator?.imageUrl ||
                "/assets/icons/profile-placeholder.svg"
              }
              alt="creator"
              className="w-12 lg:h-12 rounded-full"
            />
          </Link>

          <div className="flex flex-col">
            <p className="base-medium lg:body-bold text-light-1">
              {post.creator.name}
            </p>
            <div className="flex-center gap-2 text-light-3">
              <p className="subtle-semibold lg:small-regular ">
                {multiFormatDateString(post.$createdAt)}
              </p>
              •
              <p className="subtle-semibold lg:small-regular">
                {post.location}
              </p>
            </div>
          </div>
        </div>

        <Link
          to={`/update-post/${post.$id}`}
          className={`${user.id !== post.creator.$id && "hidden"}`}>
          <img
            src={"/assets/icons/edit.svg"}
            alt="edit"
            width={20}
            height={20}
          />
        </Link>
      </div>

      <Link to={`/posts/${post.$id}`}>
        <div className="small-medium lg:base-medium py-5">
          <p>{post.caption}</p>
          {post.tags && (
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

        <div className="relative">
          <img
            src={mainImage}
            alt="post image"
            className="post-card_img"
          />
          {mediaUrls.length > 1 && (
            <span className="absolute top-3 right-3 bg-dark-3/70 text-light-1 text-xs px-2 py-1 rounded-full">
              {mediaUrls.length} photos
            </span>
          )}
        </div>
      </Link>

      <PostStats
        post={post}
        userId={user.id}
        commentLink={`/posts/${post.$id}#comments`}
        commentCount={commentCount}
      />
    </div>
  );
};

export default PostCard;
