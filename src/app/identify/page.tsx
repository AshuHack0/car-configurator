import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';
import { IdentifyFlow } from '@/components/identify/IdentifyFlow';

export const metadata = { title: 'Upload your car — Modified' };

export default function IdentifyPage() {
  return (
    <>
      <SiteHeader />
      <IdentifyFlow />
      <SiteFooter />
    </>
  );
}
