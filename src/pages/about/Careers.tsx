import Layout from "@/components/layout/Layout";
import { MapPin, Clock, Briefcase, Heart, Users, TrendingUp, Coffee, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";

const openPositions = [
  { title: "Account Manager - Sydney", location: "Sydney, NSW", type: "Full-time", department: "Sales" },
  { title: "Technical Pre-Sales Engineer", location: "Melbourne, VIC", type: "Full-time", department: "Technical" },
  { title: "Marketing Coordinator", location: "Sydney, NSW", type: "Full-time", department: "Marketing" },
  { title: "Warehouse Supervisor", location: "Sydney, NSW", type: "Full-time", department: "Operations" },
  { title: "Inside Sales Representative", location: "Remote", type: "Full-time", department: "Sales" },
  { title: "IT Support Specialist", location: "Sydney, NSW", type: "Full-time", department: "IT" },
];

const benefits = [
  { icon: TrendingUp, title: "Career Growth", desc: "Clear progression paths and development opportunities" },
  { icon: Heart, title: "Health & Wellbeing", desc: "Comprehensive health insurance and wellness programs" },
  { icon: Users, title: "Great Culture", desc: "Collaborative, supportive team environment" },
  { icon: Coffee, title: "Work-Life Balance", desc: "Flexible working arrangements available" },
  { icon: Laptop, title: "Modern Tools", desc: "Latest technology and equipment provided" },
  { icon: Briefcase, title: "Competitive Package", desc: "Industry-leading salary and benefits" },
];

const Careers = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
              Join Our Team
            </h1>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              Build your career with Australia's leading technology distributor. 
              We're always looking for talented people who share our passion for 
              technology and customer success.
            </p>
          </div>
        </div>
      </section>

      {/* Culture */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-foreground mb-6">Our Culture</h2>
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                At Internext, we believe that great people make a great company. We foster 
                a culture of collaboration, innovation, and continuous learning where 
                everyone's contribution is valued.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you're in sales, technical, operations, or support, you'll be part 
                of a team that's passionate about helping our partners succeed. We celebrate 
                diversity, encourage new ideas, and support each other to achieve our best.
              </p>
            </div>
            <div className="bg-secondary rounded-2xl p-8">
              <div className="aspect-video bg-muted rounded-xl flex items-center justify-center">
                <span className="text-muted-foreground">Team Photo</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section-padding bg-secondary">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Why Work at Internext
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We offer a comprehensive benefits package and a supportive work environment
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="bg-card rounded-xl p-6 shadow-card">
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <benefit.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground text-sm">{benefit.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open Positions */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Open Positions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore our current opportunities and find your next career move
            </p>
          </div>

          <div className="space-y-4 max-w-4xl mx-auto">
            {openPositions.map((position, idx) => (
              <div
                key={idx}
                className="bg-card rounded-xl p-6 shadow-card border border-border/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{position.title}</h3>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" /> {position.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" /> {position.type}
                    </span>
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-4 w-4" /> {position.department}
                    </span>
                  </div>
                </div>
                <Button variant="accent">Apply Now</Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* General Application */}
      <section className="py-16 bg-primary">
        <div className="container-wide text-center">
          <h2 className="text-2xl md:text-3xl font-bold text-primary-foreground mb-4">
            Don't See the Right Role?
          </h2>
          <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
            We're always interested in hearing from talented individuals. Send us your resume 
            and we'll keep you in mind for future opportunities.
          </p>
          <Button variant="hero">Submit General Application</Button>
        </div>
      </section>
    </Layout>
  );
};

export default Careers;
