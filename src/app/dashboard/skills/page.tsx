import SkillsExplorerClient from './SkillsExplorerClient';

export default function SkillsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Skills Explorer</h1>
      </div>
      <SkillsExplorerClient />
    </div>
  );
} 