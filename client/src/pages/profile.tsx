import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigation } from "@/components/navigation";
import { PostCard } from "@/components/post-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Calendar, Users, FileText, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UserProfile, PostWithAuthor } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export default function Profile() {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const userId = parseInt(id!);

  const { data: profileData, isLoading: isLoadingProfile } = useQuery<{ user: UserProfile }>({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
  });

  const { data: postsData, isLoading: isLoadingPosts } = useQuery<{ posts: PostWithAuthor[] }>({
    queryKey: ["/api/posts", { authorId: userId }],
    enabled: !!userId,
    queryFn: async () => {
      const response = await fetch(`/api/posts?authorId=${userId}`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch posts');
      }
      
      return response.json();
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (data: { receiverId: number; content: string }) => {
      const response = await apiRequest("POST", "/api/messages", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Message sent!",
        description: "Your message has been sent successfully.",
      });
      navigate("/messages");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to send messages.",
        variant: "destructive",
      });
      return;
    }
    
    sendMessageMutation.mutate({
      receiverId: userId,
      content: `Hi ${profile?.displayName}! I'd like to connect with you.`,
    });
  };

  const profile = profileData?.user;
  const posts = postsData?.posts || [];
  const isOwnProfile = currentUser?.id === userId;

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="mb-8">
            <CardContent className="p-8">
              <div className="flex items-start space-x-6">
                <Skeleton className="w-24 h-24 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-8 w-48 mb-2" />
                  <Skeleton className="h-4 w-32 mb-4" />
                  <Skeleton className="h-16 w-full mb-4" />
                  <div className="flex space-x-6">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="p-8 text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">User Not Found</h1>
            <p className="text-gray-600">The user you're looking for doesn't exist.</p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex items-start space-x-6">
              <Avatar className="w-24 h-24">
                <AvatarImage src={profile.avatar || undefined} alt={profile.displayName} />
                <AvatarFallback className="text-2xl">
                  {profile.displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{profile.displayName}</h1>
                    <p className="text-gray-600">@{profile.username}</p>
                  </div>
                  
                  {!isOwnProfile && isAuthenticated && (
                    <Button variant={profile.isFollowing ? "outline" : "default"}>
                      {profile.isFollowing ? "Following" : "Follow"}
                    </Button>
                  )}
                </div>
                
                {profile.bio && (
                  <p className="text-gray-700 mb-4 leading-relaxed">{profile.bio}</p>
                )}
                
                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Joined {formatDistanceToNow(new Date(profile.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-6 mt-4">
                  <div className="flex items-center space-x-1">
                    <FileText className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{profile.postCount}</span>
                    <span className="text-gray-600">Posts</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{profile.followerCount}</span>
                    <span className="text-gray-600">Followers</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">{profile.followingCount}</span>
                    <span className="text-gray-600">Following</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Posts Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-gray-900">
            {isOwnProfile ? "Your Posts" : `Posts by ${profile.displayName}`}
          </h2>
          
          {isLoadingPosts ? (
            <div className="space-y-6">
              {Array.from({ length: 2 }).map((_, i) => (
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
          ) : posts.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-gray-500">
                {isOwnProfile 
                  ? "You haven't written any posts yet. Share your first thought!" 
                  : `${profile.displayName} hasn't published any posts yet.`}
              </p>
            </Card>
          ) : (
            posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
