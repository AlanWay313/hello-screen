interface TitlePageProps {
  title: string;
  description?: string;
}

export function TitlePage({ title, description }: TitlePageProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-foreground tracking-tight">
        {title}
      </h1>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">
          {description}
        </p>
      )}
    </div>
  );
}
