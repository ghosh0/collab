import { Squircle } from 'lucide-react';
import Link from 'next/link';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Left panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/70 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMtOS45NDEgMC0xOCA4LjA1OS0xOCAxOHM4LjA1OSAxOCAxOCAxOCAxOC04LjA1OSAxOC0xOC04LjA1OS0xOC0xOC0xOHptMCAzMmMtNy43MzIgMC0xNC02LjI2OC0xNC0xNHM2LjI2OC0xNCAxNC0xNCAxNCA2LjI2OCAxNCAxNC02LjI2OCAxNC0xNCAxNHoiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iLjA1Ii8+PC9nPjwvc3ZnPg==')] opacity-30" />
        <div className="flex flex-col justify-center items-center w-full p-12 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-xl">
              <Squircle className="w-10 h-10 text-white" />
            </div>
            <span className="text-white text-3xl font-bold tracking-tight">CollabBoard</span>
          </div>
          <h1 className="text-white text-4xl font-bold text-center mb-4 leading-tight">
            Collaborate on ideas,<br />visualize together
          </h1>
          <p className="text-white/80 text-lg text-center max-w-md">
            Real-time collaborative whiteboard for teams. Sketch, brainstorm, and create together seamlessly.
          </p>
          <div className="mt-12 flex gap-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl backdrop-blur-sm" />
            <div className="w-12 h-12 bg-white/10 rounded-xl backdrop-blur-sm" />
            <div className="w-12 h-12 bg-white/10 rounded-xl backdrop-blur-sm" />
          </div>
        </div>
      </div>

      {/* Right panel - Auth form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 bg-background">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2 mb-8">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center shadow-lg">
              <Squircle className="w-7 h-7 text-primary-foreground" />
            </div>
            <span className="text-foreground text-2xl font-bold tracking-tight">CollabBoard</span>
          </div>

          {children}

          <p className="text-center text-muted-foreground text-sm mt-8">
            By continuing, you agree to our{' '}
            <Link href="#" className="text-primary hover:underline font-medium">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="#" className="text-primary hover:underline font-medium">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
