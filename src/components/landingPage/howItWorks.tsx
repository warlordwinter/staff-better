export default function HowItWorks() {
  const steps = [
    {
      title: 'Upload',
      description: 'Add your candidates manually or upload a CSV file.',
    },
    {
      title: 'Set',
      description: 'Enter shift dates and times for each associate.',
    },
    {
      title: 'Remind and Track',
      description: 'That’s it! Our system sends reminders and tracks confirmations.',
    },
  ];

  return (
    <section className="py-20 px-4 bg-white text-[#2F2F2F] flex justify-center">
      <div className="max-w-7xl w-full flex flex-col items-center gap-12">
        
        {/* Section Title */}
        <h2 className="text-5xl font-black text-center">How It Works</h2>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full">
          {steps.map((step) => (
            <div key={step.title} className="flex flex-col items-center text-center px-4">
              <h3 className="text-4xl font-semibold mb-4">{step.title}</h3>
              <p className="text-2xl font-normal max-w-xs">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
