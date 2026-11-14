import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Mail, Phone, DollarSign, Users, Upload, Trash2 } from 'lucide-react';
import PageHeader from '../components/mobile/PageHeader';
import TeamMemberForm from '../components/team/TeamMemberForm';
import InviteUserDialog from '../components/team/InviteUserDialog';
import TeamImportDialog from '../components/team/TeamImportDialog';
import ContractorOnboardingStatus from '../components/team/ContractorOnboardingStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Team() {
  const [editingMember, setEditingMember] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [activeTab, setActiveTab] = useState('team');
  const [currentUser, setCurrentUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  const { data: teamMembers = [], isLoading } = useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      try {
        const users = await base44.entities.User.list('-created_date');
        const pendingInvitations = await base44.entities.PendingInvitation.filter({ processed: false });
        
        // Auto-update user names from pending invitations
        for (const invitation of pendingInvitations) {
          const user = users.find(u => u.email === invitation.email);
          if (user && !user.display_name) {
            await base44.entities.User.update(user.id, {
              display_name: invitation.intended_name
            });
            await base44.entities.PendingInvitation.update(invitation.id, {
              processed: true
            });
            user.display_name = invitation.intended_name;
          }
        }
        
        return users;
      } catch (error) {
        console.error('Error loading team members:', error);
        return [];
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
      setShowForm(false);
      setEditingMember(null);
    },
  });



  const deleteMutation = useMutation({
    mutationFn: (memberId) => base44.entities.User.delete(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team'] });
    },
  });

  const handleUpdate = (data) => {
    if (editingMember) {
      updateMutation.mutate({ id: editingMember.id, data });
    }
  };

  const handleDelete = (member) => {
    if (window.confirm(`Are you sure you want to delete ${member.display_name || member.full_name}?`)) {
      deleteMutation.mutate(member.id);
    }
  };

  const categoryConfig = {
    cpa: { label: 'CPA', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    senior_staff: { label: 'Senior Staff', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    staff: { label: 'Staff', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  };



  const groupedMembers = {
    cpa: teamMembers.filter(m => m.team_category === 'cpa'),
    senior_staff: teamMembers.filter(m => m.team_category === 'senior_staff'),
    staff: teamMembers.filter(m => m.team_category === 'staff'),
    unassigned: teamMembers.filter(m => !m.team_category),
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Team" showBack={true} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-gray-100 hidden md:block">Team</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1 text-sm md:text-base hidden md:block">Manage your team members - Login with Google accounts</p>
        </div>
        {currentUser?.role === 'admin' && (
          <div className="flex gap-2">
            <Button
              onClick={() => setShowImport(true)}
              variant="outline"
              className="border-blue-600 text-blue-600 hover:bg-blue-50"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button
              onClick={() => setShowInvite(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Add Team Member
            </Button>
          </div>
        )}
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="max-w-lg w-full">
            <InviteUserDialog onClose={() => setShowInvite(false)} currentUser={currentUser} />
          </div>
        </div>
      )}

      {showImport && (
        <TeamImportDialog 
          onClose={() => setShowImport(false)}
          onImportComplete={() => {
            queryClient.invalidateQueries({ queryKey: ['team'] });
          }}
        />
      )}

      {showForm && editingMember && (
        <TeamMemberForm
          member={editingMember}
          onSubmit={handleUpdate}
          onCancel={() => {
            setShowForm(false);
            setEditingMember(null);
          }}
        />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="team">Team Members</TabsTrigger>
          <TabsTrigger value="contractors">Contractors</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding</TabsTrigger>
        </TabsList>

        <TabsContent value="onboarding">
          <ContractorOnboardingStatus />
        </TabsContent>

        <TabsContent value="team">
          {isLoading ? (
            <div className="text-center py-12">Loading team...</div>
          ) : (
            <div className="space-y-8">
          {/* CPA Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              CPA ({groupedMembers.cpa.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedMembers.cpa.map((member) => (
                <Card
                  key={member.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setEditingMember(member);
                    setShowForm(true);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{member.display_name || member.full_name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                            CPA
                          </Badge>
                          {member.role === 'admin' && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(member);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    {(member.hourly_rate || member.billable_rate) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <div className="flex flex-col">
                          {member.hourly_rate && (
                            <span className="text-xs">Pay: ${member.hourly_rate}/hr</span>
                          )}
                          {member.billable_rate && (
                            <span className="text-xs">Bill: ${member.billable_rate}/hr</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Senior Staff Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Senior Staff ({groupedMembers.senior_staff.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedMembers.senior_staff.map((member) => (
                <Card
                  key={member.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setEditingMember(member);
                    setShowForm(true);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{member.display_name || member.full_name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge className="bg-purple-100 text-purple-800 border-purple-200">
                            Senior Staff
                          </Badge>
                          {member.role === 'admin' && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(member);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    {(member.hourly_rate || member.billable_rate) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <div className="flex flex-col">
                          {member.hourly_rate && (
                            <span className="text-xs">Pay: ${member.hourly_rate}/hr</span>
                          )}
                          {member.billable_rate && (
                            <span className="text-xs">Bill: ${member.billable_rate}/hr</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Staff Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-600" />
              Staff ({groupedMembers.staff.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedMembers.staff.map((member) => (
                <Card
                  key={member.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    setEditingMember(member);
                    setShowForm(true);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{member.display_name || member.full_name}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
                            Staff
                          </Badge>
                          {member.role === 'admin' && (
                            <Badge className="bg-red-100 text-red-800 border-red-200">
                              Admin
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(member);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="w-4 h-4" />
                      <span className="truncate">{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-4 h-4" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                    {(member.hourly_rate || member.billable_rate) && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <div className="flex flex-col">
                          {member.hourly_rate && (
                            <span className="text-xs">Pay: ${member.hourly_rate}/hr</span>
                          )}
                          {member.billable_rate && (
                            <span className="text-xs">Bill: ${member.billable_rate}/hr</span>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Unassigned Members */}
          {groupedMembers.unassigned.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                Unassigned ({groupedMembers.unassigned.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedMembers.unassigned.map((member) => (
                  <Card
                    key={member.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer border-dashed"
                    onClick={() => {
                      setEditingMember(member);
                      setShowForm(true);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg">{member.display_name || member.full_name}</CardTitle>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(member);
                          }}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-2">Click to assign category</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="contractors">
          <div className="text-center py-12 text-gray-500">
            Contractor-specific view - coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}