import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { X, Save } from 'lucide-react';

export default function TeamMemberForm({ member, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    team_category: member.team_category || '',
    phone: member.phone || '',
    hourly_rate: member.hourly_rate || '',
    billable_rate: member.billable_rate || '',
    active: member.active !== undefined ? member.active : true,
    role: member.role || 'user',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Team Member - {member.display_name || member.full_name}</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="role">Access Role</Label>
            <Select
              value={formData.role}
              onValueChange={(value) => setFormData({ ...formData, role: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              Admin users have full access. Users have limited access based on team category.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="team_category">Team Category</Label>
              <Select
                value={formData.team_category}
                onValueChange={(value) => setFormData({ ...formData, team_category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cpa">CPA</SelectItem>
                  <SelectItem value="senior_staff">Senior Staff</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hourly_rate">Hourly Rate - Pay ($)</Label>
              <Input
                id="hourly_rate"
                type="number"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) })}
                placeholder="Rate paid to contractor"
              />
              <p className="text-xs text-gray-500">Rate you pay this team member</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billable_rate">Billable Rate - Charge ($)</Label>
              <Input
                id="billable_rate"
                type="number"
                step="0.01"
                value={formData.billable_rate}
                onChange={(e) => setFormData({ ...formData, billable_rate: parseFloat(e.target.value) })}
                placeholder="Rate charged to clients"
              />
              <p className="text-xs text-gray-500">Rate charged to clients for invoicing</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Active Status</Label>
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
            </div>
            <p className="text-xs text-gray-500">
              Inactive users cannot log in but their historical data is preserved
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Email:</strong> {member.email}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            Update
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}