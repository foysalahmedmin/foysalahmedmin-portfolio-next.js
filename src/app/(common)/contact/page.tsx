"use client";

import { Button } from "@/components/ui/button";
import { Github, Linkedin, Mail, MapPin, Phone, Send, Twitter } from "lucide-react";
import React, { useState } from "react";

const ContactPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    
    // Simulate API call
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        setStatus("success");
        setFormData({ name: "", email: "", subject: "", message: "" });
    } catch (e) {
        setStatus("error");
    }
  };

  const contactInfo = [
    {
      icon: <Mail className="size-6" />,
      label: "Email",
      value: "foysalahmedmin@gmail.com",
      href: "mailto:foysalahmedmin@gmail.com",
    },
    {
      icon: <Phone className="size-6" />,
      label: "Phone",
      value: "+880 1XXXXXXXXX",
      href: "tel:+8801XXXXXXXXX",
    },
    {
      icon: <MapPin className="size-6" />,
      label: "Location",
      value: "Dhaka, Bangladesh",
      href: "https://maps.google.com/?q=Dhaka,Bangladesh",
    },
  ];

  const socials = [
    { icon: <Linkedin className="size-5" />, href: "https://www.linkedin.com/in/foysalahmedmin/" },
    { icon: <Github className="size-5" />, href: "https://github.com/foysalahmedmin" },
    { icon: <Twitter className="size-5" />, href: "#" },
  ];

  return (
    <main className="min-h-screen pt-16">
      {/* Header */}
      <section className="bg-muted/30 border-b border-border py-20 lg:py-32">
        <div className="container px-6 mx-auto">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight md:text-6xl">Get in <span className="text-primary">Touch</span></h1>
            <p className="text-muted-foreground mt-6 text-lg leading-relaxed md:text-xl">
              I'm always open to new opportunities, collaborations, or just a friendly chat. Feel free to reach out using the form below or through my contact details.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 lg:py-32">
        <div className="container px-6 mx-auto">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-2">
            {/* Contact Details */}
            <div className="space-y-12">
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-1">
                {contactInfo.map((info, i) => (
                  <a 
                    key={i} 
                    href={info.href} 
                    className="fade-left group flex items-start gap-6 rounded-2xl border border-border bg-card p-8 transition-all hover:border-primary/50"
                    style={{ animationDelay: `${i * 0.1}s` }}
                  >
                    <div className="bg-primary/10 flex size-14 items-center justify-center rounded-xl text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                      {info.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold uppercase tracking-widest text-primary">{info.label}</p>
                      <p className="mt-1 text-lg font-bold">{info.value}</p>
                    </div>
                  </a>
                ))}
              </div>

              <div className="fade-up pt-8">
                <h3 className="mb-6 text-xl font-bold">Follow Me</h3>
                <div className="flex gap-4">
                  {socials.map((social, i) => (
                    <a 
                      key={i} 
                      href={social.href} 
                      target="_blank" 
                      className="bg-card flex size-12 items-center justify-center rounded-xl border border-border transition-all hover:bg-primary hover:text-primary-foreground hover:shadow-lg"
                    >
                      {social.icon}
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="fade-right rounded-3xl border border-border bg-card p-8 shadow-sm lg:p-12">
              <div className="mb-10">
                <h3 className="text-2xl font-bold">Send a Message</h3>
                <p className="text-muted-foreground mt-2">I'll get back to you within 24 hours.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-bold tracking-tight uppercase">Full Name</label>
                    <input
                      required
                      type="text"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-all"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold tracking-tight uppercase">Email Address</label>
                    <input
                      required
                      type="email"
                      className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-all"
                      placeholder="john@example.com"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold tracking-tight uppercase">Subject</label>
                  <input
                    required
                    type="text"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-all"
                    placeholder="Project Inquiry"
                    value={formData.subject}
                    onChange={e => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold tracking-tight uppercase">Message</label>
                  <textarea
                    required
                    rows={6}
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 focus:border-primary focus:outline-none transition-all resize-none"
                    placeholder="Tell me more about your project..."
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  size="lg" 
                  className="w-full sm:w-auto px-12 uppercase font-bold tracking-widest"
                  disabled={status === "loading" || status === "success"}
                >
                  {status === "loading" ? "Sending..." : status === "success" ? "Message Sent!" : "Send Message"}
                  <Send className="ml-2 size-4" />
                </Button>

                {status === "success" && (
                    <div className="mt-4 rounded-lg bg-green-500/10 p-4 text-sm font-medium text-green-500 border border-green-500/20">
                        Thank you! Your message has been sent successfully.
                    </div>
                )}
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Google Map */}
      <section className="h-[500px] w-full bg-muted">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d116834.00977788!2d90.349284!3d23.7808875!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b8b087026b81%3A0x8fa5690c31864291!2sDhaka!5e0!3m2!1sen!2sbd!4v1711234567890!5m2!1sen!2sbd"
          width="100%"
          height="100%"
          style={{ border: 0, filter: 'grayscale(100%) invert(90%) contrast(90%)' }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>
    </main>
  );
};

export default ContactPage;
