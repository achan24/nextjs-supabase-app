'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowRight, CheckCircle2, AlertCircle, Milestone, ArrowUpRight } from 'lucide-react';

interface TrackDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  track: {
    id: string;
    name: string;
    icon: any;
    description: string;
    stages: {
      name: string;
      description: string;
    }[];
  };
  peopleCount: number;
}

interface StageGuidance {
  do: string[];
  dont: string[];
  transition: {
    requirements: string[];
    signals: string[];
  };
}

export function TrackDetailDialog({ isOpen, onClose, track, peopleCount }: TrackDetailDialogProps) {
  const Icon = track.icon;

  const getStageGuidance = (stageName: string): StageGuidance => {
    const guidance = {
      // Romantic Track
      'Open': {
        do: [
          'Notice and create opportunities for interaction',
          'Show genuine interest in their interests',
          'Be present in shared spaces',
        ],
        dont: [
          'Force interactions',
          'Come on too strong',
          'Make assumptions about their interest',
        ],
        transition: {
          requirements: [
            'At least 2-3 natural interactions',
            'Some signs of mutual recognition',
            'Comfortable being in the same space',
          ],
          signals: [
            'They remember details about you',
            'They seem happy to see you',
            'Natural opportunities for interaction exist',
          ],
        },
      },
      'Connect': {
        do: [
          'Engage in casual conversation',
          'Find common ground and shared interests',
          'Be consistent in communication',
        ],
        dont: [
          'Rush into personal topics',
          'Monopolize their time',
          'Ignore social boundaries',
        ],
        transition: {
          requirements: [
            'Regular casual conversations',
            'Exchange of contact info',
            'Some one-on-one interactions',
          ],
          signals: [
            'They initiate conversations sometimes',
            'You have inside jokes or shared references',
            'Communication feels natural and easy',
          ],
        },
      },
      'Spike': {
        do: [
          'Create moments of excitement or intrigue',
          'Show your unique qualities',
          'Be playful and engaging',
        ],
        dont: [
          'Play games or manipulate',
          'Ignore their comfort level',
          'Rush physical escalation',
        ],
        transition: {
          requirements: [
            'Several successful one-on-one interactions',
            'Clear signs of mutual attraction',
            'Some physical proximity comfort',
          ],
          signals: [
            'They seek your attention',
            'Body language shows attraction',
            'They make time specifically for you',
          ],
        },
      },
      'Qualify': {
        do: [
          'Have deeper conversations about values',
          'Share personal stories and vulnerabilities',
          'Observe how they handle different situations',
        ],
        dont: [
          'Judge or criticize their values',
          'Hide deal-breakers',
          'Ignore red flags',
        ],
        transition: {
          requirements: [
            'Multiple deep conversations',
            'Understanding of core values',
            'Shared vulnerable moments',
          ],
          signals: [
            'They open up about personal matters',
            'Values and life goals align',
            'Mutual trust is established',
          ],
        },
      },
      'Bond': {
        do: [
          'Create shared experiences',
          'Show emotional availability',
          'Include them in your world',
        ],
        dont: [
          'Rush emotional intimacy',
          'Neglect other relationships',
          'Lose your independence',
        ],
        transition: {
          requirements: [
            'Regular meaningful time together',
            'Integration with each other\'s lives',
            'Strong emotional connection',
          ],
          signals: [
            'They include you in future plans',
            'You\'re part of each other\'s inner circle',
            'Strong emotional support exists',
          ],
        },
      },
      'Decide': {
        do: [
          'Have honest conversations about the future',
          'Express your feelings clearly',
          'Listen to their perspective',
        ],
        dont: [
          'Pressure for commitment',
          'Ignore their timeline',
          'Make ultimatums',
        ],
        transition: {
          requirements: [
            'Clear mutual understanding',
            'Aligned relationship goals',
            'Readiness for commitment',
          ],
          signals: [
            'They talk about long-term future',
            'Mutual desire for commitment',
            'Natural progression to exclusivity',
          ],
        },
      },
      // Friendship Track
      'Contact': {
        do: [
          'Be approachable and friendly',
          'Find natural conversation starters',
          'Show openness to connection',
        ],
        dont: [
          'Force conversation',
          'Overshare too soon',
          'Be too pushy',
        ],
        transition: {
          requirements: [
            'Multiple positive interactions',
            'Basic comfort level established',
            'Some shared context or interests',
          ],
          signals: [
            'They engage willingly in conversation',
            'Positive body language',
            'Remember previous interactions',
          ],
        },
      },
      'Activity': {
        do: [
          'Suggest casual hangouts',
          'Join group activities',
          'Show up consistently',
        ],
        dont: [
          'Make every hangout intense',
          'Demand too much time',
          'Take rejection personally',
        ],
        transition: {
          requirements: [
            'Several successful group activities',
            'Some one-on-one hangouts',
            'Consistent participation',
          ],
          signals: [
            'They suggest activities too',
            'Comfortable spending time together',
            'Natural flow in conversations',
          ],
        },
      },
      'Trust': {
        do: [
          'Keep confidences',
          'Show reliability',
          'Be there in tough times',
        ],
        dont: [
          'Gossip about them',
          'Break promises',
          'Take advantage',
        ],
        transition: {
          requirements: [
            'Proven reliability',
            'Mutual support shown',
            'Respected boundaries',
          ],
          signals: [
            'They share personal information',
            'Seek your advice or help',
            'Trust you with sensitive matters',
          ],
        },
      },
      'Shared Identity': {
        do: [
          'Create inside jokes',
          'Develop shared traditions',
          'Include in friend groups',
        ],
        dont: [
          'Force traditions',
          'Exclude others',
          'Be possessive',
        ],
        transition: {
          requirements: [
            'Regular meaningful interactions',
            'Established shared experiences',
            'Integration into social circles',
          ],
          signals: [
            'Natural inclusion in plans',
            'Shared friend group dynamics',
            'Strong mutual understanding',
          ],
        },
      },
      'Loyalty': {
        do: [
          'Stand up for them',
          'Celebrate their successes',
          'Be consistent in support',
        ],
        dont: [
          'Enable bad behavior',
          'Expect blind loyalty',
          'Neglect boundaries',
        ],
        transition: {
          requirements: [
            'Proven mutual support',
            'Consistent reliability',
            'Deep understanding',
          ],
          signals: [
            'They defend you to others',
            'Prioritize the friendship',
            'Long-term commitment shown',
          ],
        },
      },
      // Social Track
      'Spot': {
        do: [
          'Notice potential connections',
          'Observe social dynamics',
          'Stay open to opportunities',
        ],
        dont: [
          'Judge too quickly',
          'Ignore social context',
          'Miss social cues',
        ],
        transition: {
          requirements: [
            'Regular social interactions',
            'Understanding of social norms',
            'Ability to recognize opportunities',
          ],
          signals: [
            'They initiate social contact',
            'They seek your opinion on social matters',
            'They make you feel comfortable in social settings',
          ],
        },
      },
      'Ping': {
        do: [
          'Make light social contact',
          'Engage on social media',
          'Be visible in shared spaces',
        ],
        dont: [
          'Overdo social media',
          'Be too aggressive',
          'Ignore responses',
        ],
        transition: {
          requirements: [
            'Regular social media engagement',
            'Consistent presence in shared spaces',
            'Natural flow of social interactions',
          ],
          signals: [
            'They comment on your posts',
            'They seek your attention on social media',
            'They make you feel valued on social platforms',
          ],
        },
      },
      'Test': {
        do: [
          'Have brief, positive interactions',
          'Find common interests',
          'Show social value',
        ],
        dont: [
          'Force conversation',
          'Overstay welcome',
          'Be too intense',
        ],
        transition: {
          requirements: [
            'Several positive interactions',
            'Basic comfort level established',
            'Some shared interests',
          ],
          signals: [
            'They engage willingly in conversation',
            'Positive body language',
            'Remember previous interactions',
          ],
        },
      },
      'Hook': {
        do: [
          'Create future meeting points',
          'Connect through mutual friends',
          'Share relevant opportunities',
        ],
        dont: [
          'Be too pushy',
          'Ignore their interest level',
          'Create fake scenarios',
        ],
        transition: {
          requirements: [
            'Several successful one-on-one interactions',
            'Clear signs of mutual attraction',
            'Some physical proximity comfort',
          ],
          signals: [
            'They seek your attention',
            'Body language shows attraction',
            'They make time specifically for you',
          ],
        },
      },
      'Recur': {
        do: [
          'Maintain casual contact',
          'Be reliably present',
          'Add consistent value',
        ],
        dont: [
          'Demand attention',
          'Become clingy',
          'Force deeper connection',
        ],
        transition: {
          requirements: [
            'Regular reliable presence',
            'Consistent value added',
            'Natural flow of interactions',
          ],
          signals: [
            'They expect your presence',
            'They rely on your support',
            'They feel comfortable with your consistency',
          ],
        },
      },
      // Mentor Track
      'Intro': {
        do: [
          'Research their work/background',
          'Show genuine interest',
          'Be professional',
        ],
        dont: [
          'Ask for too much',
          'Be unprepared',
          'Waste their time',
        ],
        transition: {
          requirements: [
            'Clear understanding of their expertise',
            'Proven interest in their field',
            'Ability to demonstrate value',
          ],
          signals: [
            'They seek your advice',
            'They value your expertise',
            'They feel comfortable sharing with you',
          ],
        },
      },
      'Value': {
        do: [
          'Show your potential',
          'Ask thoughtful questions',
          'Follow through on advice',
        ],
        dont: [
          'Expect immediate results',
          'Take without giving',
          'Ignore their guidance',
        ],
        transition: {
          requirements: [
            'Proven reliability',
            'Mutual support shown',
            'Respected boundaries',
          ],
          signals: [
            'They share personal information',
            'Seek your advice or help',
            'Trust you with sensitive matters',
          ],
        },
      },
      'Conversation': {
        do: [
          'Share your progress',
          'Discuss industry topics',
          'Ask for specific advice',
        ],
        dont: [
          'Dominate the conversation',
          'Be unprofessional',
          'Ignore boundaries',
        ],
        transition: {
          requirements: [
            'Regular meaningful conversations',
            'Understanding of each other\'s interests',
            'Ability to engage in meaningful discussions',
          ],
          signals: [
            'They initiate conversations about your progress',
            'They show genuine interest in your work',
            'They feel comfortable sharing their thoughts',
          ],
        },
      },
      'Relationship': {
        do: [
          'Build mutual trust',
          'Show growth and progress',
          'Be reliable',
        ],
        dont: [
          'Take advantage',
          'Neglect the relationship',
          'Overstep boundaries',
        ],
        transition: {
          requirements: [
            'Proven mutual support',
            'Consistent reliability',
            'Deep understanding',
          ],
          signals: [
            'They defend you to others',
            'Prioritize the friendship',
            'Long-term commitment shown',
          ],
        },
      },
      'Mutuality': {
        do: [
          'Give back when possible',
          'Share opportunities',
          'Support their goals',
        ],
        dont: [
          'Forget their help',
          'Stop growing',
          'Become dependent',
        ],
        transition: {
          requirements: [
            'Proven mutual support',
            'Consistent reliability',
            'Deep understanding',
          ],
          signals: [
            'They defend you to others',
            'Prioritize the friendship',
            'Long-term commitment shown',
          ],
        },
      },
    };

    return guidance[stageName as keyof typeof guidance] || {
      do: ['No specific guidance available'],
      dont: ['No specific guidance available'],
      transition: {
        requirements: ['No specific requirements available'],
        signals: ['No specific signals available'],
      },
    };
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[800px] p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon className="h-6 w-6 text-blue-500" />
              <DialogTitle className="text-xl font-semibold text-gray-900">
                {track.name} Track
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 p-0 hover:bg-gray-100 rounded-full"
              onClick={onClose}
            >
              <X className="h-4 w-4 text-gray-500" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">{track.description}</p>
          <p className="text-sm text-gray-500 mt-1">
            {peopleCount} {peopleCount === 1 ? 'person' : 'people'} in this track
          </p>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {track.stages.map((stage, index) => (
              <div key={stage.name} className="relative">
                {index < track.stages.length - 1 && (
                  <div className="absolute left-6 top-14 bottom-0 w-0.5 bg-gray-200" />
                )}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900">{stage.name}</h3>
                      <p className="text-gray-600">{stage.description}</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center gap-2 text-green-600 font-medium">
                            <CheckCircle2 className="h-5 w-5" />
                            Do
                          </div>
                          <ul className="space-y-2">
                            {getStageGuidance(stage.name).do.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <ArrowRight className="h-4 w-4 mt-0.5 text-green-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center gap-2 text-red-600 font-medium">
                            <AlertCircle className="h-5 w-5" />
                            Don't
                          </div>
                          <ul className="space-y-2">
                            {getStageGuidance(stage.name).dont.map((item, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm">
                                <ArrowRight className="h-4 w-4 mt-0.5 text-red-500" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="p-4 space-y-4">
                          <div className="flex items-center gap-2 text-blue-600 font-medium">
                            <ArrowUpRight className="h-5 w-5" />
                            Ready to Progress When...
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                              <Milestone className="h-4 w-4" />
                              Requirements
                            </h4>
                            <ul className="space-y-2">
                              {getStageGuidance(stage.name).transition.requirements.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <ArrowRight className="h-4 w-4 mt-0.5 text-blue-500" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Positive Signals</h4>
                            <ul className="space-y-2">
                              {getStageGuidance(stage.name).transition.signals.map((item, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                  <ArrowRight className="h-4 w-4 mt-0.5 text-purple-500" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 