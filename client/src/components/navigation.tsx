import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Search, PlusCircle, Bell, User, LogOut, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { AuthForms } from "./auth-forms";
import { CreatePostModal } from "./create-post-modal";
import { useQuery } from "@tanstack/react-query";

interface NavigationProps {
  onSearch?: (query: string) => void;
}

export function Navigation({ onSearch }: NavigationProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location, navigate] = useLocation();
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get unread message count
  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/messages/unread-count"],
    enabled: isAuthenticated,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim() && onSearch) {
      onSearch(searchQuery.trim());
    }
  };

  const handleCreatePost = () => {
    if (!isAuthenticated) {
      setShowAuthForm(true);
      return;
    }
    setShowCreatePost(true);
  };

  return (
    <>
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <Link href="/">
                <div className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity">
                  <img 
                    src="/bee-logo.png" 
                    alt="BeeBlogs Logo" 
                    className="h-10 w-10"
                  />
                  <h1 className="text-2xl font-bold text-primary">
                    BeeBlogs
                  </h1>
                </div>
              </Link>
            </div>
            
            {/* Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="relative">
                <Input
                  type="text"
                  placeholder="Search posts, topics, or authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              </form>
            </div>
            
            {/* User Actions */}
            <div className="flex items-center space-x-4">
              <Button
                onClick={handleCreatePost}
                className="bg-primary text-white px-4 py-2 rounded-full hover:bg-blue-700 transition-colors duration-200 font-medium"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Write
              </Button>

              {isAuthenticated ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="relative text-gray-600 hover:text-gray-800"
                    onClick={() => navigate("/messages")}
                  >
                    <MessageCircle className="h-5 w-5" />
                    {unreadData && unreadData.count > 0 && (
                      <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center">
                        {unreadData.count > 99 ? "99+" : unreadData.count}
                      </span>
                    )}
                  </Button>

                  <Button variant="ghost" size="icon" className="text-gray-600 hover:text-gray-800">
                    <Bell className="h-5 w-5" />
                  </Button>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user?.avatar || undefined} alt={user?.displayName} />
                          <AvatarFallback>
                            {user?.displayName?.charAt(0)?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                      <DropdownMenuItem onClick={() => navigate(`/profile/${user?.id}`)}>
                        <User className="mr-2 h-4 w-4" />
                        <span>Profile</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => logout()}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <Button onClick={() => setShowAuthForm(true)} variant="outline">
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthForms 
        open={showAuthForm} 
        onOpenChange={setShowAuthForm}
      />
      
      <CreatePostModal 
        open={showCreatePost} 
        onOpenChange={setShowCreatePost}
      />
    </>
  );
}
