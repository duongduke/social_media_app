import { useState, useEffect } from "react";
import { Models } from "appwrite";
import { Link } from "react-router-dom";

import { Button } from "../ui/button";
import { useUserContext } from "@/context/AuthContext";
import { useFollowUser, useUnfollowUser } from "@/lib/react-query/queries";
import { getFollowRecord } from "@/lib/appwrite/api";

type UserCardProps = {
  user: Models.Document;
};

const UserCard = ({ user }: UserCardProps) => {
  const { user: currentUser } = useUserContext();
  const { mutate: follow } = useFollowUser();
  const { mutate: unfollow } = useUnfollowUser();

  const [isFollowing, setIsFollowing] = useState(false);
  const [isCheckingFollow, setIsCheckingFollow] = useState(true);

  // Kiểm tra xem đã follow chưa
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (!user.$id || !currentUser.id || user.$id === currentUser.id) {
        setIsCheckingFollow(false);
        return;
      }

      try {
        const followRecord = await getFollowRecord(currentUser.id, user.$id);
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
  }, [user.$id, currentUser.id]);

  const handleFollow = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user.$id || !currentUser.id) return;

    if (isFollowing) {
      unfollow(
        { followerId: currentUser.id, followingId: user.$id },
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
        { followerId: currentUser.id, followingId: user.$id },
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

  return (
    <Link to={`/profile/${user.$id}`} className="user-card">
      <img
        src={user.imageUrl || "/assets/icons/profile-placeholder.svg"}
        alt="creator"
        className="rounded-full w-14 h-14"
      />

      <div className="flex-center flex-col gap-1">
        <p className="base-medium text-light-1 text-center line-clamp-1">
          {user.name}
        </p>
        <p className="small-regular text-light-3 text-center line-clamp-1">
          @{user.username}
        </p>
      </div>

      <Button
        type="button"
        size="sm"
        className="shad-button_primary px-5 transition-transform duration-150 active:scale-95 disabled:active:scale-100"
        onClick={handleFollow}
        disabled={isCheckingFollow || user.$id === currentUser.id}
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </Button>
    </Link>
  );
};

export default UserCard;
