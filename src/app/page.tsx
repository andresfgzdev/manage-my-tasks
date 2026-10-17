import Header from "@/components/layout/header";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <Header />
        <section className="w-full h-[calc(100vh-5rem)] flex items-center justify-center bg-gradient-to-b from-background to-background/80">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="flex flex-col items-center justify-center text-center space-y-12">
              <div className="space-y-6">
                <h1 className="text-6xl md:text-8xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  Better Tasks
                </h1>
                <p className="text-2xl md:text-3xl text-muted-foreground max-w-2xl mx-auto animate-in fade-in-50 slide-in-from-bottom-4 duration-500 delay-150">
                  Manage your tasks with ease and keep track of your
                  productivity.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
