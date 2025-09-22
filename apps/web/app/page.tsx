import { Button } from "@/components/ui/button";
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <h1 className="text-3xl font-bold mb-4">Bienvenido a AcústicaSounds</h1>
      <p className="mb-6 text-muted-foreground text-center max-w-lg">
        Tu plataforma de cursos audiovisuales con tecnología DRM.
      </p>
      <Link href="/courses">
        <Button>Explorar cursos</Button>
      </Link>
    </main>
  );
}
