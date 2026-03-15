import { AlertTriangle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground">
      <div className="flex flex-col items-center gap-4 text-center p-8">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-6 h-6 text-red-400" />
        </div>
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-[0.3em] text-primary/50 mb-2">Error 404</div>
          <h1 className="text-xl font-bold font-mono text-foreground/80 tracking-wide">Page Not Found</h1>
          <p className="text-sm text-muted-foreground/60 mt-2 font-mono">The requested route does not exist.</p>
        </div>
        <a
          href="/"
          className="flex items-center gap-2 px-4 py-2 rounded-md text-[11px] font-mono font-bold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 hover:bg-primary/20 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Return to Dashboard
        </a>
      </div>
    </div>
  );
}
