'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

interface SkillNode {
  id: string;
  label: string;
  type: 'skill' | 'target';
  level?: number;
  children?: SkillNode[];
  parentId?: string;
}

export default function SkillsExplorerClient() {
  const [skillTree, setSkillTree] = useState<SkillNode[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadSkills() {
      setLoading(true);
      // TODO: Load process flows and convert to tree structure
      const { data: flows, error } = await supabase
        .from('process_flows')
        .select('*');

      if (error) {
        console.error('Error loading skills:', error);
        return;
      }

      // TODO: Convert flows to tree structure
      setSkillTree([]);
      setLoading(false);
    }

    loadSkills();
  }, [supabase]);

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Tree Navigation */}
      <div className="col-span-3 space-y-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Skills</h2>
          {loading ? (
            <div>Loading skills...</div>
          ) : (
            <div className="space-y-2">
              {/* TODO: Render tree structure */}
              <div className="text-sm text-gray-600">No skills found</div>
            </div>
          )}
        </Card>
      </div>

      {/* Main Content */}
      <div className="col-span-9 space-y-4">
        <Card className="p-4">
          <h2 className="text-lg font-semibold mb-4">Skill Details</h2>
          <div className="text-sm text-gray-600">
            Select a skill to view details
          </div>
        </Card>
      </div>
    </div>
  );
} 