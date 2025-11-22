import {
  Route,
  Routes,
  Link,
  Outlet,
  useParams,
  useLocation,
} from "react-router-dom";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui";
import { LikedPosts } from "@/_root/pages";
import { useUserContext } from "@/context/AuthContext";
import { useGetUserById, useGetUserPosts, useFollowUser, useUnfollowUser, useGetFollowersCount, useGetFollowingCount } from "@/lib/react-query/queries";
import { getFollowRecord } from "@/lib/appwrite/api";
import { GridPostList, Loader } from "@/components/shared";

interface StabBlockProps {
  value: string | number;
  label: string;
}

const StatBlock = ({ value, label }: StabBlockProps) => (
  <div className="flex-center gap-2">
    <p className="small-semibold lg:body-bold text-primary-500">{value}</p>
    <p className="small-medium lg:base-medium text-light-2">{label}</p>
  </div>
);

const Profile = () => {
  const { id } = useParams();
  const { user } = useUserContext();
  const { pathname } = useLocation();

  const { data: currentUser } = useGetUserById(id || "");
  const { data: userPosts } = useGetUserPosts(id || "");
  const { mutate: follow } = useFollowUser();
  const { mutate: unfollow } = useUnfollowUser();
  const { data: followersCount = 0 } = useGetFollowersCount(id || "");
  const { data: followingCount = 0 } = useGetFollowingCount(id || "");

  const [isFollowing, setIsFollowing] = useState(false);
  const [isCheckingFollow, setIsCheckingFollow] = useState(true);

  // Kiểm tra xem đã follow chưa
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!id || !user.id || id === user.id) {
        setIsCheckingFollow(false);
        return;
      }

      try {
        const followRecord = await getFollowRecord(user.id, id);
        setIsFollowing(!!followRecord);
      } catch (error: any) {
        // Không log error nếu collection chưa tồn tại (404)
        if (error?.code !== 404) {
          console.error("Error checking follow status:", error);
        }
      } finally {
        setIsCheckingFollow(false);
      }
    };

    checkFollowStatus();
  }, [id, user.id]);

  const handleFollow = () => {
    if (!id || !user.id) return;

    if (isFollowing) {
      unfollow(
        { followerId: user.id, followingId: id },
        {
          onSuccess: () => {
            setIsFollowing(false);
          },
          onError: (error: any) => {
            if (error?.code === 404) {
              // Collection chưa tồn tại, hiển thị thông báo
              console.warn("Collection 'follows' chưa được tạo. Vui lòng tạo collection trong Appwrite Console.");
            }
          },
        }
      );
    } else {
      follow(
        { followerId: user.id, followingId: id },
        {
          onSuccess: () => {
            setIsFollowing(true);
          },
          onError: (error: any) => {
            if (error?.code === 404 || error?.message?.includes("follows")) {
              // Collection chưa tồn tại, hiển thị thông báo
              console.warn("Collection 'follows' chưa được tạo. Vui lòng tạo collection trong Appwrite Console. Xem file SETUP_FOLLOWS.md để biết chi tiết.");
            }
          },
        }
      );
    }
  };

  if (!currentUser)
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    );

  return (
    <div className="profile-container">
      <div className="profile-inner_container">
        <div className="flex xl:flex-row flex-col max-xl:items-center flex-1 gap-7">
          <img
            src={
              currentUser.imageUrl || "/assets/icons/profile-placeholder.svg"
            }
            alt="profile"
            className="w-28 h-28 lg:h-36 lg:w-36 rounded-full"
          />
          <div className="flex flex-col flex-1 justify-between md:mt-2">
            <div className="flex flex-col w-full">
              <h1 className="text-center xl:text-left h3-bold md:h1-semibold w-full">
                {currentUser.name}
              </h1>
              <p className="small-regular md:body-medium text-light-3 text-center xl:text-left">
                @{currentUser.username}
              </p>
            </div>

            <div className="flex gap-8 mt-10 items-center justify-center xl:justify-start flex-wrap z-20">
              <StatBlock value={userPosts?.documents?.length || 0} label="Posts" />
              <StatBlock value={followersCount} label="Followers" />
              <StatBlock value={followingCount} label="Following" />
            </div>

            <p className="small-medium md:base-medium text-center xl:text-left mt-7 max-w-screen-sm">
              {currentUser.bio}
            </p>
          </div>

          <div className="flex justify-center gap-4">
            <div className={`${user.id !== currentUser.$id && "hidden"}`}>
              <Link
                to={`/update-profile/${currentUser.$id}`}
                className={`h-12 bg-dark-4 px-5 text-light-1 flex-center gap-2 rounded-lg ${
                  user.id !== currentUser.$id && "hidden"
                }`}>
                <img
                  src={"/assets/icons/edit.svg"}
                  alt="edit"
                  width={20}
                  height={20}
                />
                <p className="flex whitespace-nowrap small-medium">
                  Edit Profile
                </p>
              </Link>
            </div>
            <div className={`${user.id === id && "hidden"}`}>
              <Button
                type="button"
                className="shad-button_primary px-8"
                onClick={handleFollow}
                disabled={isCheckingFollow}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {currentUser.$id === user.id && (
        <div className="flex max-w-5xl w-full">
          <Link
            to={`/profile/${id}`}
            className={`profile-tab rounded-l-lg ${
              pathname === `/profile/${id}` && "!bg-dark-3"
            }`}>
            <img
              src={"/assets/icons/posts.svg"}
              alt="posts"
              width={20}
              height={20}
            />
            Posts
          </Link>
          <Link
            to={`/profile/${id}/liked-posts`}
            className={`profile-tab rounded-r-lg ${
              pathname === `/profile/${id}/liked-posts` && "!bg-dark-3"
            }`}>
            <img
              src={"/assets/icons/like.svg"}
              alt="like"
              width={20}
              height={20}
            />
            Liked Posts
          </Link>
        </div>
      )}

      <Routes>
        <Route
          index
          element={<GridPostList posts={userPosts?.documents || []} showUser={false} />}
        />
        {currentUser.$id === user.id && (
          <Route path="/liked-posts" element={<LikedPosts />} />
        )}
      </Routes>
      <Outlet />
    </div>
  );
};

export default Profile;
