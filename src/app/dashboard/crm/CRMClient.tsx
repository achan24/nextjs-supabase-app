'use client';

import { useState, useEffect } from 'react';
import { User } from '@supabase/auth-helpers-nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Users, Heart, Briefcase, UserPlus, Search, ArrowRightCircle, SignalHigh, Radio, CalendarPlus, MessageSquarePlus, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddPersonDialog } from './components/AddPersonDialog';
import { AssignTrackDialog } from './components/AssignTrackDialog';
import { TrackSignalsDialog } from './components/TrackSignalsDialog';
import { TrackDetailDialog } from './components/TrackDetailDialog';
import { createClient } from '@/lib/supabase/client';
import { Person, Track, PersonWithMetadata, CrmAction } from '@/types/crm';
import { StageActionChecklist } from './components/StageActionChecklist';

interface CRMClientProps {
  user: User;
}

interface TrackWithStages {
  id: string;
  name: string;
  icon: any;
  description: string;
  stages: {
    name: string;
    description: string;
  }[];
}

const tracks: TrackWithStages[] = [
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
        description: 'Light interaction. Small talk, social media engagement, or brief exchanges.'
      },
      {
        name: 'Test',
        description: 'Exploring connection. Group activities, shared interests, or mutual friends.'
      },
      {
        name: 'Hook',
        description: 'Building rapport. One-on-one interactions, deeper conversations, finding commonalities.'
      },
      {
        name: 'Recur',
        description: 'Regular contact. Consistent presence in each other\'s social circles.'
      }
    ]
  },
  {
    id: '4f67c03a-cc67-4f8c-a3c0-6f668b2e48f2', // Mentor track
    name: 'Mentor',
    icon: Briefcase,
    description: 'Build relationships with professional mentors and advisors',
    stages: [
      {
        name: 'Intro',
        description: 'Initial contact. Research their work, make professional introduction.'
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
  const [selectedTrack, setSelectedTrack] = useState<TrackWithStages | null>(null);
  const [selectedAction, setSelectedAction] = useState<CrmAction | null>(null);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [people, setPeople] = useState<Person[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedStageActions, setExpandedStageActions] = useState<string | null>(null);

  useEffect(() => {
    loadPeople();
  }, []);

  const loadPeople = async () => {
    try {
      console.log('Loading people...');
      const supabase = createClient();

      // Get current session
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('Session error:', sessionError);
        throw sessionError;
      }
      if (!sessionData.session?.user?.id) {
        console.error('No authenticated user');
        throw new Error('No authenticated user');
      }
      const userId = sessionData.session.user.id;
      console.log('Current User ID:', userId);

      // First, do a simple query to check all people
      const { data: allPeople, error: checkError } = await supabase
        .from('crm_people')
        .select('id, name, user_id');
      
      if (checkError) {
        console.error('Error checking people:', checkError);
      } else {
        console.log('All people in database:', allPeople);
      }

      // Now do the full query, specifying which foreign key to use
      const { data, error } = await supabase
        .from('crm_people')
        .select(`
          *,
          metadata:crm_person_metadata(*),
          tracks:crm_person_tracks(
            *,
            track:crm_tracks(*),
            current_stage:crm_stages(
              *,
              actions:crm_stage_actions(*)
            )
          ),
          actions:crm_actions(
            *,
            feedback:crm_action_feedback(*)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching people:', error);
        throw error;
      }
      console.log('Loaded people:', data);
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

  const getPersonActions = (person: PersonWithMetadata) => {
    return person.actions || [];
  };

  const handleActionClick = (e: React.MouseEvent, person: Person, action: CrmAction) => {
    e.stopPropagation();
    setSelectedAction(action);
    setSelectedPerson(person);
    // setIsActionFeedbackOpen(true); // This state was removed
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Relationships</h1>
          <p className="text-gray-600">Manage and nurture your connections</p>
        </div>
        <Button onClick={() => setIsAddPersonOpen(true)}>
          <PlusCircle className="w-5 h-5 mr-2" />
          Add Person
        </Button>
      </div>

      <div className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by name, nickname, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
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

      {isLoading ? (
        <div className="text-center text-gray-500">Loading...</div>
      ) : filteredPeople.length === 0 ? (
        <div className="text-center text-gray-500">No people found. Add someone to get started!</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPeople.map((person) => (
            <Card key={person.id} className="relative">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{person.name}</span>
                  {person.nickname && (
                    <span className="text-sm text-gray-500">"{person.nickname}"</span>
                  )}
                </CardTitle>
                {person.location && (
                  <CardDescription>📍 {person.location}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Track and Stage */}
                  {(person as PersonWithMetadata).tracks?.[0] ? (
                    <div>
                      <div className="text-sm text-gray-500 mb-1">Current Track</div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{(person as PersonWithMetadata).tracks![0].track?.name}</span>
                        <ArrowRightCircle className="w-4 h-4" />
                        <span>{(person as PersonWithMetadata).tracks![0].current_stage?.name} Stage</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-end">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPerson(person);
                          setIsAssignTrackOpen(true);
                        }}
                      >
                        <Radio className="w-4 h-4 mr-2" />
                        Assign Track
                      </Button>
                    </div>
                  )}

                  {/* Latest Signals */}
                  {(person as PersonWithMetadata).tracks?.[0] && (
                    <>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500">Latest Signals</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPerson(person);
                            setIsSignalsOpen(true);
                          }}
                        >
                          <SignalHigh className="w-4 h-4 mr-2" />
                          Track Signals
                        </Button>
                      </div>
                      {getLatestSignals(person as PersonWithMetadata) ? (
                        <div className="text-sm">
                          {getLatestSignals(person as PersonWithMetadata)?.signals.map((signal, i) => (
                            <div key={i} className="flex items-center gap-2 text-gray-600">
                              <span>•</span>
                              <span>{signal}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500">No signals tracked yet</div>
                      )}

                      {/* Stage Actions */}
                      <StageActionChecklist
                        person={person as PersonWithMetadata}
                        onActionCompleted={loadPeople}
                      />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      <TrackDetailDialog
        isOpen={isTrackDetailOpen}
        onClose={() => {
          setIsTrackDetailOpen(false);
          setSelectedTrack(null);
        }}
        track={selectedTrack}
        peopleCount={filteredPeople.filter(p => 
          (p as PersonWithMetadata).tracks?.some(t => t.track?.name === selectedTrack?.name)
        ).length}
      />
    </div>
  );
} 