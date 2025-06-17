import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { PostCard } from "@/components/post-card";
import { Sidebar } from "@/components/sidebar";
import { CreatePostModal } from "@/components/create-post-modal";
import { AuthForms } from "@/components/auth-forms";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { PlusCircle, Image, Video, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { PostWithAuthor } from "@shared/schema";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState("");
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [currentQuery, setCurrentQuery] = useState("");

  const { data: postsData, isLoading, error } = useQuery<{ posts: PostWithAuthor[] }>({
    queryKey: ["/api/posts", { search: currentQuery, tag: selectedTag }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (currentQuery) params.set('search', currentQuery);
      if (selectedTag) params.set('tag', selectedTag);
      
      const response = await fetch(`/api/posts?${params.toString()}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      return response.json();
    },
  });

  const handleSearch = (query: string) => {
    setCurrentQuery(query);
    setSelectedTag("");
  };

  const handleTagClick = (tag: string) => {
    setSelectedTag(tag);
    setCurrentQuery("");
  };

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      setShowAuthForm(true);
      return;
    }
    setShowCreatePost(true);
  };

  useEffect(() => {
    document.title = "BlogSphere - Social Blogging Platform";
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation onSearch={handleSearch} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <Sidebar onTagClick={handleTagClick} />
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-3">
            {/* Create Post Card */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  {isAuthenticated ? (
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={user?.avatar || undefined} alt={user?.displayName} />
                      <AvatarFallback>
                        {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                      <PlusCircle className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <Button
                      variant="outline"
                      className="w-full justify-start text-gray-500 bg-gray-50 hover:bg-gray-100"
                      onClick={handleCreatePost}
                    >
                      What's on your mind? Share your thoughts...
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
                  <div className="flex space-x-6">
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary">
                      <Image className="w-4 h-4 mr-2" />
                      Photo
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary">
                      <Video className="w-4 h-4 mr-2" />
                      Video
                    </Button>
                    <Button variant="ghost" size="sm" className="text-gray-600 hover:text-primary">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Poll
                    </Button>
                  </div>
                  <Button onClick={handleCreatePost}>
                    Write Article
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Current filter indicator */}
            {(currentQuery || selectedTag) && (
              <Card className="mb-6 bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-blue-700">
                      {currentQuery ? `Searching for: "${currentQuery}"` : `Filtering by tag: #${selectedTag}`}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentQuery("");
                        setSelectedTag("");
                      }}
                      className="text-blue-700 hover:text-blue-800"
                    >
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts Feed */}
            {isLoading ? (
              <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-3" />
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-5/6 mb-4" />
                    <Skeleton className="h-40 w-full rounded-lg" />
                  </Card>
                ))}
              </div>
            ) : error ? (
              <Card className="p-6 text-center">
                <p className="text-red-500">Failed to load posts. Please try again.</p>
              </Card>
            ) : postsData?.posts?.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-gray-500">
                  {currentQuery || selectedTag 
                    ? "No posts found matching your criteria." 
                    : "No posts available. Be the first to share something!"}
                </p>
              </Card>
            ) : (
              postsData?.posts?.map((post) => (
                <PostCard key={post.id} post={post} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button (Mobile) */}
      <Button
        onClick={handleCreatePost}
        className="lg:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg z-40 p-0"
      >
        <PlusCircle className="w-6 h-6" />
      </Button>

      <CreatePostModal 
        open={showCreatePost} 
        onOpenChange={setShowCreatePost}
      />
      
      <AuthForms 
        open={showAuthForm} 
        onOpenChange={setShowAuthForm}
      />
    </div>
  );
}
