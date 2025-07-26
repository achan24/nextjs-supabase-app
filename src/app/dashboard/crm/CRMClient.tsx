'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, Heart, Briefcase, UserPlus, Search, ArrowRightCircle, SignalHigh, Radio } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddPersonDialog } from './components/AddPersonDialog';
import { AssignTrackDialog } from './components/AssignTrackDialog';
import { TrackSignalsDialog } from './components/TrackSignalsDialog';
import { TrackDetailDialog } from './components/TrackDetailDialog';
import { createClient } from '@/lib/supabase';
import { Person, Track, PersonWithMetadata } from '@/types/crm';

interface CRMClientProps {
  user: User;
}

const tracks = [
  {
    id: '1c37c03a-cc67-4f8c-a3c0-6f668b2e48f2', // Romantic track
    name: 'Romantic',
    icon: Heart,
    description: 'Track romantic relationships through stages from initial spark to deep connection',
    stages: [
      {
        name: 'Open',
        description: 'Initial interest/curiosity. You notice them or have brief interactions. No substantial contact yet.'
      },
      {
        name: 'Connect',
        description: 'Regular communication, getting comfortable. May include group hangouts, casual chats, social media interaction.'
      },
      {
        name: 'Spike',
        description: 'Building attraction and chemistry. First dates, flirting, creating moments of tension and excitement.'
      },
      {
        name: 'Qualify',
        description: 'Exploring compatibility. Deep conversations, understanding values, seeing how you fit into each other\'s lives.'
      },
      {
        name: 'Bond',
        description: 'Growing emotional intimacy. Sharing vulnerabilities, creating shared experiences, meeting important people.'
      },
      {
        name: 'Decide',
        description: 'Defining the relationship. Discussing exclusivity, future plans, and commitment level.'
      }
    ]
  },
  {
    id: '2d47c03a-cc67-4f8c-a3c0-6f668b2e48f2', // Friendship track
    name: 'Friendship',
    icon: Users,
    description: 'Develop meaningful friendships from first contact to lasting loyalty',
    stages: [
      {
        name: 'Contact',
        description: 'First meaningful interactions. Moving past acquaintance to intentional connection.'
      },
      {
        name: 'Activity',
        description: 'Doing things together. Shared experiences, hobbies, or regular meetups.'
      },
      {
        name: 'Trust',
        description: 'Opening up emotionally. Sharing personal stories, concerns, and celebrations.'
      },
      {
        name: 'Shared Identity',
        description: 'Creating friendship rituals. Inside jokes, regular traditions, mutual friends.'
      },
      {
        name: 'Loyalty',
        description: 'Deep mutual support. Being there in tough times, celebrating successes, reliable presence.'
      }
    ]
  },
  {
    id: '3e57c03a-cc67-4f8c-a3c0-6f668b2e48f2', // Social track
    name: 'Social Expansion',
    icon: UserPlus,
    description: 'Turn acquaintances into valuable connections in your social circle',
    stages: [
      {
        name: 'Spot',
        description: 'Identifying potential connections. People you regularly see or share mutual contacts with.'
      },
      {
        name: 'Ping',
        description: 'Light social contact. Small talk, social media engagement, group interactions.'
      },
      {
        name: 'Test',
        description: 'Initial social exchanges. Brief conversations, finding common interests.'
      },
      {
        name: 'Hook',
        description: 'Creating future contact points. Finding reasons to connect again, shared activities.'
      },
      {
        name: 'Recur',
        description: 'Regular social presence. Consistent casual interaction, part of your social ecosystem.'
      }
    ]
  },
  {
    id: '4f67c03a-cc67-4f8c-a3c0-6f668b2e48f2', // Mentor track
    name: 'Mentor / Network',
    icon: Briefcase,
    description: 'Build professional relationships from introduction to mutual growth',
    stages: [
      {
        name: 'Intro',
        description: 'Professional introduction. Establishing basic connection and credibility.'
      },
      {
        name: 'Value',
        description: 'Demonstrating potential. Sharing insights, showing genuine interest in their expertise.'
      },
      {
        name: 'Conversation',
        description: 'Meaningful exchanges. In-depth discussions about field, challenges, opportunities.'
      },
      {
        name: 'Relationship',
        description: 'Building trust. Regular valuable interactions, seeking and following advice.'
      },
      {
        name: 'Mutuality',
        description: 'Two-way growth. Contributing back, becoming a valuable part of their network.'
      }
    ]
  }
];

export default function CRMClient({ user }: CRMClientProps) {
  const [isAddPersonOpen, setIsAddPersonOpen] = useState(false);
  const [isAssignTrackOpen, setIsAssignTrackOpen] = useState(false);
  const [isSignalsOpen, setIsSignalsOpen] = useState(false);
  const [isTrackDetailOpen, setIsTrackDetailOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [selectedTrack, setSelectedTrack] = useState<(typeof tracks)[0] | null>(null);
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

  const getLatestSignals = (person: PersonWithMetadata) => {
    if (!person.metadata) return null;

    const signalsMetadata = person.metadata
      .filter(m => m.category === 'signals')
      .sort((a, b) => new Date(b.key).getTime() - new Date(a.key).getTime())[0];

    if (!signalsMetadata) return null;

    try {
      const data = JSON.parse(signalsMetadata.value);
      return {
        signals: data.signals as string[],
        notes: data.notes as string,
        timestamp: new Date(data.timestamp),
      };
    } catch (e) {
      console.error('Error parsing signals:', e);
      return null;
    }
  };

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
              onClick={() => {
                setSelectedTrack(track);
                setIsTrackDetailOpen(true);
              }}
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
                      key={stage.name}
                      className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {stage.name}
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
            <div className="text-gray-500">Loading people...</div>
          ) : filteredPeople.length === 0 ? (
            <div className="text-gray-500">
              {searchQuery ? 'No people found matching your search.' : 'No people added yet.'}
            </div>
          ) : (
            filteredPeople.map((person) => {
              const latestSignals = getLatestSignals(person as PersonWithMetadata);
              
              return (
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
                      <div className="text-sm text-gray-600 mb-4">{person.first_met_context}</div>
                    )}
                    <div className="flex flex-wrap gap-2 mb-4">
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

                    {latestSignals && (
                      <div className="mb-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Radio className="h-4 w-4" />
                          Latest Signals
                          <span className="text-xs text-gray-500">
                            ({new Date(latestSignals.timestamp).toLocaleDateString()})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {latestSignals.signals.map((signal) => (
                            <span
                              key={signal}
                              className="inline-flex items-center px-2 py-1 bg-gray-50 text-gray-700 text-xs rounded-full"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                        {latestSignals.notes && (
                          <div className="text-xs text-gray-600 italic">
                            {latestSignals.notes}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 flex items-center justify-center gap-2"
                        onClick={() => {
                          setSelectedPerson(person);
                          setIsAssignTrackOpen(true);
                        }}
                      >
                        <ArrowRightCircle className="h-4 w-4" />
                        Assign Track
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 flex items-center justify-center gap-2"
                        onClick={() => {
                          setSelectedPerson(person);
                          setIsSignalsOpen(true);
                        }}
                      >
                        <SignalHigh className="h-4 w-4" />
                        Track Signals
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <AddPersonDialog
        isOpen={isAddPersonOpen}
        onClose={() => setIsAddPersonOpen(false)}
        onPersonAdded={handlePersonAdded}
      />

      {selectedPerson && (
        <>
          <AssignTrackDialog
            isOpen={isAssignTrackOpen}
            onClose={() => {
              setIsAssignTrackOpen(false);
              setSelectedPerson(null);
            }}
            person={selectedPerson}
            onTrackAssigned={loadPeople}
            availableTracks={tracks}
          />

          <TrackSignalsDialog
            isOpen={isSignalsOpen}
            onClose={() => {
              setIsSignalsOpen(false);
              setSelectedPerson(null);
            }}
            person={selectedPerson}
            onSignalAdded={loadPeople}
          />
        </>
      )}

      {selectedTrack && (
        <TrackDetailDialog
          isOpen={isTrackDetailOpen}
          onClose={() => {
            setIsTrackDetailOpen(false);
            setSelectedTrack(null);
          }}
          track={selectedTrack}
          peopleCount={filteredPeople.filter(p => 
            (p as PersonWithMetadata).tracks?.some(t => t.track?.name === selectedTrack.name)
          ).length}
        />
      )}
    </div>
  );
} 