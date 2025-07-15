import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, User, Key, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PasskeyAuth } from "@/components/passkey-auth";

export default function AccountSettingsPage() {
  const { data: user } = useQuery({
    queryKey: ['/api/user'],
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        
        <h1 className="text-3xl font-bold mb-2">Account Settings</h1>
        <p className="text-gray-600">
          Manage your account security and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Key className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your basic account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm font-medium text-gray-500">Username</div>
                <div className="mt-1 text-lg">{user?.username}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Email</div>
                <div className="mt-1 text-lg">{user?.email}</div>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-500">Role</div>
                <div className="mt-1 text-lg capitalize">{user?.role}</div>
              </div>
              {user?.displayName && (
                <div>
                  <div className="text-sm font-medium text-gray-500">Display Name</div>
                  <div className="mt-1 text-lg">{user.displayName}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>
                Update your password regularly for better security
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/password-change-required">
                <Button variant="outline">
                  <Key className="h-4 w-4 mr-2" />
                  Change Password
                </Button>
              </Link>
            </CardContent>
          </Card>

          <PasskeyAuth />
        </TabsContent>

        <TabsContent value="templates" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>SOAP Templates</CardTitle>
              <CardDescription>
                Manage your documentation templates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/user-settings">
                <Button variant="outline">
                  Manage SOAP Templates
                </Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}