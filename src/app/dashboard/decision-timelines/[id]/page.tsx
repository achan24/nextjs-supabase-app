import DecisionTimelines from '@/components/DecisionTimelines';

export default function TimelineEditPage({ params }: { params: { id: string } }) {
  return <DecisionTimelines timelineId={params.id} />;
}
