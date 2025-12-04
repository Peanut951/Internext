import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Linkedin, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const teamSections = [
  {
    title: "Executive Leadership",
    members: [
      { name: "Michael Chen", role: "Chief Executive Officer", bio: "20+ years in technology distribution" },
      { name: "Sarah Williams", role: "Chief Operating Officer", bio: "Former logistics executive with global experience" },
      { name: "David Thompson", role: "Chief Financial Officer", bio: "Strategic finance leader with M&A expertise" },
      { name: "Lisa Anderson", role: "Chief Technology Officer", bio: "Digital transformation specialist" },
    ],
  },
  {
    title: "Sales Team",
    members: [
      { name: "James Mitchell", role: "National Sales Director", bio: "Leading our Australia-wide sales strategy" },
      { name: "Emma Roberts", role: "Enterprise Sales Manager", bio: "Specialising in large-scale deployments" },
      { name: "Tom Wilson", role: "SMB Sales Manager", bio: "Supporting growing businesses" },
      { name: "Rachel Lee", role: "Inside Sales Lead", bio: "Driving efficient transactional sales" },
    ],
  },
  {
    title: "Technical Specialists",
    members: [
      { name: "Andrew Park", role: "Solutions Architect", bio: "AV and collaboration expert" },
      { name: "Michelle Wong", role: "Security Specialist", bio: "IP surveillance and access control" },
      { name: "Peter Brown", role: "Network Engineer", bio: "Infrastructure and networking" },
      { name: "Sophie Taylor", role: "Print Specialist", bio: "MPS and print solutions" },
    ],
  },
  {
    title: "Marketing & Operations",
    members: [
      { name: "Jennifer Blake", role: "Marketing Director", bio: "Brand and demand generation" },
      { name: "Mark Stevens", role: "Operations Manager", bio: "Warehouse and logistics excellence" },
      { name: "Karen Hughes", role: "Partner Programs Manager", bio: "Vendor relationships and programs" },
      { name: "Chris Martin", role: "Customer Success Lead", bio: "Ensuring partner satisfaction" },
    ],
  },
];

const Team = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Meet Our Team
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              The dedicated professionals behind Internext who are committed to 
              supporting your business success every day.
            </p>
          </div>
        </div>
      </section>

      {/* Team Sections */}
      {teamSections.map((section, sectionIdx) => (
        <section
          key={section.title}
          className={`section-padding ${sectionIdx % 2 === 0 ? 'bg-background' : 'bg-secondary'}`}
        >
          <div className="container-wide">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">
              {section.title}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {section.members.map((member) => (
                <div
                  key={member.name}
                  className="bg-card rounded-xl p-6 shadow-card border border-border/50 text-center"
                >
                  <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-muted-foreground">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{member.name}</h3>
                  <p className="text-accent text-sm mb-2">{member.role}</p>
                  <p className="text-muted-foreground text-sm mb-4">{member.bio}</p>
                  <div className="flex justify-center gap-3">
                    <a href="#" className="text-muted-foreground hover:text-accent transition-colors">
                      <Linkedin className="h-5 w-5" />
                    </a>
                    <a href="#" className="text-muted-foreground hover:text-accent transition-colors">
                      <Mail className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Join Team CTA */}
      <section className="py-16 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Want to Join Our Team?
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            We're always looking for talented individuals to join Internext.
          </p>
          <Button variant="hero" asChild>
            <Link to="/about/careers">View Open Positions</Link>
          </Button>
        </div>
      </section>
    </Layout>
  );
};

export default Team;
