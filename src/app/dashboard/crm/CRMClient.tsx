'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, Heart, Briefcase, UserPlus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddPersonDialog } from './components/AddPersonDialog';
import { createClient } from '@/lib/supabase';
import { Person, Track, PersonWithMetadata } from '@/types/crm';

interface CRMClientProps {
  user: User;
}

const tracks = [
  {
    id: 'romantic',
    name: 'Romantic',
    icon: Heart,
    description: 'Track romantic relationships through stages from initial spark to deep connection',
    stages: ['Open', 'Connect', 'Spike', 'Qualify', 'Bond', 'Decide']
  },
  {
    id: 'friendship',
    name: 'Friendship',
    icon: Users,
    description: 'Develop meaningful friendships from first contact to lasting loyalty',
    stages: ['Contact', 'Activity', 'Trust', 'Shared Identity', 'Loyalty']
  },
  {
    id: 'social',
    name: 'Social Expansion',
    icon: UserPlus,
    description: 'Turn acquaintances into valuable connections in your social circle',
    stages: ['Spot', 'Ping', 'Test', 'Hook', 'Recur']
  },
  {
    id: 'mentor',
    name: 'Mentor / Network',
    icon: Briefcase,
    description: 'Build professional relationships from introduction to mutual growth',
    stages: ['Intro', 'Value', 'Conversation', 'Relationship', 'Mutuality']
  }
];

export default function CRMClient({ user }: CRMClientProps) {
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('crm_people')
        .select(`
          *,
          metadata:crm_person_metadata(*),
          tracks:crm_person_tracks(
            *,
            track:crm_tracks(*),
            current_stage:crm_stages(*)
          ),
          actions:crm_actions(
            *,
            feedback:crm_action_feedback(*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPeople(data || []);
    } catch (err) {
      console.error('Error loading people:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePersonAdded = (person: Person) => {
    setPeople([person, ...people]);
  };

  const filteredPeople = people.filter(person =>
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.nickname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Relationship CRM</h1>
          <p className="text-gray-600 mt-2">Track and nurture your relationships through meaningful stages</p>
        </div>
        <Button 
          className="flex items-center gap-2"
          onClick={() => setIsAddPersonOpen(true)}
        >
          <PlusCircle className="h-5 w-5" />
          Add Person
        </Button>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            className="pl-10"
            placeholder="Search people by name, nickname, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {tracks.map((track) => {
          const Icon = track.icon;
          const peopleInTrack = filteredPeople.filter(p => 
            (p as PersonWithMetadata).tracks?.some(t => t.track?.name === track.name)
          );
          
          return (
            <Card 
              key={track.id}
              className={`cursor-pointer transition-all ${
                activeTrack === track.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
              }`}
              onClick={() => setActiveTrack(track.id)}
            >
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Icon className="h-6 w-6 text-blue-500" />
                  <CardTitle>{track.name}</CardTitle>
                </div>
                <CardDescription>{track.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {track.stages.map((stage, index) => (
                    <span 
                      key={stage}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {stage}
                      {index < track.stages.length - 1 && (
                        <span className="mx-1 text-gray-400">→</span>
                      )}
                    </span>
                  ))}
                </div>
                <div className="mt-4 text-sm text-gray-500">
                  {peopleInTrack.length} {peopleInTrack.length === 1 ? 'person' : 'people'}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-12">
        <h2 className="text-2xl font-semibold mb-6">People ({filteredPeople.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <p className="text-gray-500">Loading people...</p>
          ) : filteredPeople.length === 0 ? (
            <p className="text-gray-500">
              {searchQuery ? 'No people found matching your search.' : 'No people added yet.'}
            </p>
          ) : (
            filteredPeople.map((person) => (
              <Card key={person.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {person.name}
                    {person.nickname && (
                      <span className="text-sm text-gray-500">({person.nickname})</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{person.role}</span>
                      {person.location && (
                        <>
                          <span className="text-gray-300">•</span>
                          <span>{person.location}</span>
                        </>
                      )}
                    </div>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {person.first_met_context && (
                    <p className="text-sm text-gray-600 mb-4">{person.first_met_context}</p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {(person as PersonWithMetadata).tracks?.map((personTrack) => (
                      <span
                        key={personTrack.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-sm rounded-full"
                      >
                        {personTrack.track?.name}
                        {personTrack.current_stage && (
                          <>
                            <span className="text-gray-400 mx-1">•</span>
                            {personTrack.current_stage.name}
                          </>
                        )}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <AddPersonDialog
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onPersonAdded={handlePersonAdded}
      />
    </div>
  );
} 