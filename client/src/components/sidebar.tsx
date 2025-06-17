import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import type { UserProfile } from "@shared/schema";

interface SidebarProps {
  onTagClick?: (tag: string) => void;
}

export function Sidebar({ onTagClick }: SidebarProps) {
  const { isAuthenticated } = useAuth();

  const { data: trendingTags, isLoading: isLoadingTags } = useQuery({
    queryKey: ["/api/trending/tags"],
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  const { data: suggestedAuthors, isLoading: isLoadingAuthors } = useQuery<{ authors: UserProfile[] }>({
    queryKey: ["/api/suggested/authors"],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });

  return (
    <div className="space-y-6">
      {/* Popular Topics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Popular Topics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoadingTags ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-8" />
              </div>
            ))
          ) : trendingTags?.tags?.length > 0 ? (
            trendingTags.tags.map((tag: { tag: string; count: number }) => (
              <div key={tag.tag} className="flex items-center justify-between">
                <button
                  onClick={() => onTagClick?.(tag.tag)}
                  className="text-sm text-gray-600 hover:text-primary cursor-pointer transition-colors"
                >
                  #{tag.tag}
                </button>
                <span className="text-xs text-gray-400">{tag.count}</span>
              </div>
            ))
          ) : (
            <div className="space-y-2">
              <Badge variant="secondary" className="cursor-pointer hover:bg-blue-50" onClick={() => onTagClick?.('Technology')}>
                Technology
              </Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-blue-50" onClick={() => onTagClick?.('Design')}>
                Design
              </Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-blue-50" onClick={() => onTagClick?.('Programming')}>
                Programming
              </Badge>
              <Badge variant="secondary" className="cursor-pointer hover:bg-blue-50" onClick={() => onTagClick?.('Lifestyle')}>
                Lifestyle
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suggested Authors */}
      {isAuthenticated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Suggested Authors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingAuthors ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-8 w-16" />
                </div>
              ))
            ) : suggestedAuthors?.authors?.length > 0 ? (
              suggestedAuthors.authors.map((author) => (
                <div key={author.id} className="flex items-center space-x-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={author.avatar || undefined} alt={author.displayName} />
                    <AvatarFallback>
                      {author.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{author.displayName}</p>
                    <p className="text-xs text-gray-500">@{author.username}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                  >
                    {author.isFollowing ? "Following" : "Follow"}
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No suggestions available</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
