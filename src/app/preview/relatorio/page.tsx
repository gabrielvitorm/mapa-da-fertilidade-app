import { ReportView } from '@/components/screens/ReportView';
import { sampleAssessmentResult } from './fixture';

export default function ReportPreviewPage() {
  return <ReportView result={sampleAssessmentResult} />;
}
