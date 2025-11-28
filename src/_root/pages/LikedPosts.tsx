import { GridPostList, Loader } from "@/components/shared";
import { useGetCurrentUser, useGetLikedPosts } from "@/lib/react-query/queries";

const LikedPosts = () => {
  const { data: currentUser, isLoading: isUserLoading } = useGetCurrentUser();
  const { data: likedPostsData, isLoading: isLikedPostsLoading } = useGetLikedPosts(currentUser?.$id);

  if (isUserLoading || isLikedPostsLoading)
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );

  if (!currentUser)
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );

  const likedPosts = likedPostsData?.documents || [];

  return (
    <>
      {likedPosts.length === 0 ? (
        <p className="text-light-4 mt-10 text-center w-full">No liked posts</p>
      ) : (
        <GridPostList posts={likedPosts} showStats={false} />
      )}
    </>
  );
};

export default LikedPosts;
