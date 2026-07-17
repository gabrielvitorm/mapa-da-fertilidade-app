import { ReportView } from '@/components/screens/ReportView';
import { sampleAssessmentResult } from './fixture';

export default function ReportPreviewPage() {
  const result = sampleAssessmentResult;

  return <ReportView result={result} />;
}
