'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RelationshipRole, Person } from '@/types/crm';
import { createClient } from '@/lib/supabase';
import { X } from 'lucide-react';

interface AddPersonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonAdded: (person: Person) => void;
}

export function AddPersonDialog({ isOpen, onClose, onPersonAdded }: AddPersonDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    nickname: '',
    role: '' as RelationshipRole,
    first_met_date: '',
    first_met_context: '',
    location: '',
    birthday: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { data: person, error } = await supabase
        .from('crm_people')
        .insert([{
          name: formData.name,
          nickname: formData.nickname || null,
          role: formData.role,
          first_met_date: formData.first_met_date || null,
          first_met_context: formData.first_met_context || null,
          location: formData.location || null,
          birthday: formData.birthday || null,
          status: 'active'
        }])
        .select()
        .single();

      if (error) throw error;

      onPersonAdded(person);
      onClose();
      setFormData({
        name: '',
        nickname: '',
        role: '' as RelationshipRole,
        first_met_date: '',
        first_met_context: '',
        location: '',
        birthday: '',
      });
    } catch (err) {
      console.error('Error adding person:', err);
      setError('Failed to add person. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0">
        <div className="flex flex-col h-full">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-semibold text-gray-900">Add New Person</DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
                onClick={onClose}
              >
                <X className="h-4 w-4 text-gray-500" />
              </Button>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
            <div className="px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                  Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Full name"
                  className="w-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="nickname" className="text-sm font-medium text-gray-700">
                  Nickname
                </Label>
                <Input
                  id="nickname"
                  value={formData.nickname}
                  onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                  placeholder="Preferred name or nickname"
                  className="w-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role" className="text-sm font-medium text-gray-700">
                  Relationship Type *
                </Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value as RelationshipRole })}
                  required
                >
                  <SelectTrigger className="w-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white">
                    <SelectValue placeholder="Select relationship type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="romantic">Romantic</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="acquaintance">Acquaintance</SelectItem>
                    <SelectItem value="mentor">Mentor</SelectItem>
                    <SelectItem value="mentee">Mentee</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="first_met_date" className="text-sm font-medium text-gray-700">
                  When Did You Meet?
                </Label>
                <Input
                  id="first_met_date"
                  type="date"
                  value={formData.first_met_date}
                  onChange={(e) => setFormData({ ...formData, first_met_date: e.target.value })}
                  className="w-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="first_met_context" className="text-sm font-medium text-gray-700">
                  How Did You Meet?
                </Label>
                <Textarea
                  id="first_met_context"
                  value={formData.first_met_context}
                  onChange={(e) => setFormData({ ...formData, first_met_context: e.target.value })}
                  placeholder="Context of your first meeting"
                  className="w-full min-h-[80px] border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-sm font-medium text-gray-700">
                  Location
                </Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="City, Country"
                  className="w-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-sm font-medium text-gray-700">
                  Birthday
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                  className="w-full border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {error && (
                <div className="text-red-600 text-sm">{error}</div>
              )}
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name || !formData.role}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Adding...' : 'Add Person'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
} 