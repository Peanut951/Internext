import Layout from "@/components/layout/Layout";
import { Link } from "react-router-dom";
import { Calendar, User, ArrowRight, Tag } from "lucide-react";

const categories = ["All", "Product Guides", "Promotions", "Sales Tips", "Industry Updates"];

const posts = [
  {
    title: "Top 10 Questions About Interactive Displays Answered",
    excerpt: "Everything you need to know about selling interactive panels to education and corporate customers.",
    category: "Product Guides",
    author: "Andrew Park",
    date: "28 Nov 2024",
    image: "",
  },
  {
    title: "December Promotions: Save Big on Security Solutions",
    excerpt: "End-of-year deals on IP cameras, NVRs, and access control systems from our top vendors.",
    category: "Promotions",
    author: "Jennifer Blake",
    date: "25 Nov 2024",
    image: "",
  },
  {
    title: "How to Position Managed Print Services to SMBs",
    excerpt: "A practical guide to selling MPS contracts to small and medium businesses.",
    category: "Sales Tips",
    author: "Sophie Taylor",
    date: "20 Nov 2024",
    image: "",
  },
  {
    title: "WiFi 7: What Resellers Need to Know",
    excerpt: "The next generation of wireless is coming. Here's how to prepare your customers.",
    category: "Industry Updates",
    author: "Peter Brown",
    date: "15 Nov 2024",
    image: "",
  },
  {
    title: "Choosing the Right Conference Room Solution",
    excerpt: "Guide to matching video conferencing equipment with room sizes and use cases.",
    category: "Product Guides",
    author: "Andrew Park",
    date: "10 Nov 2024",
    image: "",
  },
  {
    title: "Q4 Push: Maximise Your Year-End Sales",
    excerpt: "Strategies for closing deals and hitting targets before the holiday season.",
    category: "Sales Tips",
    author: "Emma Roberts",
    date: "5 Nov 2024",
    image: "",
  },
];

const Blog = () => {
  return (
    <Layout>
      {/* Hero */}
      <section className="bg-gradient-hero py-16 md:py-20">
        <div className="container-wide">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-4">
              Blog & Insights
            </h1>
            <p className="text-xl text-primary-foreground/80">
              Product guides, sales tips, and industry news to help you succeed.
            </p>
          </div>
        </div>
      </section>

      {/* Category Filter */}
      <section className="py-6 bg-secondary border-b border-border">
        <div className="container-wide">
          <div className="flex flex-wrap gap-2">
            {categories.map((cat, idx) => (
              <button
                key={cat}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  idx === 0 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-card text-foreground hover:bg-accent/10'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Posts Grid */}
      <section className="section-padding bg-background">
        <div className="container-wide">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post, idx) => (
              <article
                key={idx}
                className="bg-card rounded-xl overflow-hidden shadow-card border border-border/50 hover:shadow-elevated transition-shadow group"
              >
                <div className="aspect-video bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Featured Image</span>
                </div>
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                      {post.category}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-muted-foreground text-sm mb-4">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" /> {post.author}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {post.date}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-12">
            <button className="inline-flex items-center gap-2 text-accent font-semibold hover:underline">
              Load More Articles <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Blog;
