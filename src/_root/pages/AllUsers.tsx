import { useState, useEffect } from "react";

import { Input, Button } from "@/components/ui";
import { useToast } from "@/components/ui/use-toast";
import { Loader, UserCard } from "@/components/shared";
import { useGetUsers } from "@/lib/react-query/queries";
import useDebounce from "@/hooks/useDebounce";

const USERS_PER_PAGE = 9;

const AllUsers = () => {
  const { toast } = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(searchValue, 500);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const {
    data: creators,
    isLoading,
    isError: isErrorCreators,
    isFetching,
  } = useGetUsers({
    page,
    limit: USERS_PER_PAGE,
    searchTerm: debouncedSearch,
  });

  useEffect(() => {
    if (isErrorCreators) {
      toast({ title: "Something went wrong." });
    }
  }, [isErrorCreators, toast]);

  const totalUsers = creators?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalUsers / USERS_PER_PAGE));
  const usersList = creators?.documents ?? [];

  if (isErrorCreators) {
    return (
      <div className="common-container">
        <div className="user-container">
          <h2 className="h3-bold md:h2-bold text-left w-full">All Users</h2>
          <p className="text-light-4 mt-10 text-center w-full">
            Unable to load users. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="common-container">
      <div className="user-container">
        <div className="flex flex-col gap-4 w-full">
          <h2 className="h3-bold md:h2-bold text-left w-full">All Users</h2>
          <div className="flex items-center gap-3 bg-dark-4 px-4 py-2 rounded-xl">
            <img src="/assets/icons/search.svg" width={20} height={20} alt="search" />
            <Input
              type="text"
              placeholder="Search users by name..."
              className="explore-search flex-1 bg-transparent border-none outline-none focus-visible:ring-0 text-light-1"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
          </div>
        </div>

        {isLoading && !creators ? (
          <Loader />
        ) : (
          <>
            {usersList.length === 0 ? (
              <p className="text-light-4 text-center w-full mt-10">No users found.</p>
            ) : (
              <>
                <ul className="user-grid">
                  {usersList.map((creator) => (
                    <li key={creator?.$id} className="flex-1 min-w-[200px] w-full">
                      <UserCard user={creator} />
                    </li>
                  ))}
                </ul>
                <div className="flex items-center justify-between w-full mt-8 flex-wrap gap-4">
                  <p className="text-light-3">
                    Page {page} of {totalPages} • {totalUsers} users
                  </p>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      className="shad-button_dark_4 px-4 py-2"
                      disabled={page === 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      Previous
                    </Button>
                    <Button
                      type="button"
                      className="shad-button_primary px-6 py-2"
                      disabled={page === totalPages}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        )}
        {isFetching && (
          <div className="flex-center mt-4">
            <Loader />
          </div>
        )}
      </div>
    </div>
  );
};

export default AllUsers;
