"use client";

import { cn } from "@/lib/utils";
import {
    ArrowDownRight,
    ArrowUpRight,
    Briefcase,
    Clock,
    FileText,
    MessageSquare,
    TrendingUp
} from "lucide-react";

const StatsCard = ({ title, value, change, icon, trend }: any) => (
    <div className="rounded-3xl border border-border bg-card p-8 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                {icon}
            </div>
            <div className={cn(
                "flex items-center gap-1 text-sm font-bold",
                trend === 'up' ? "text-green-500" : "text-red-500"
            )}>
                {change} {trend === 'up' ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
            </div>
        </div>
        <div className="mt-6">
            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
            <h3 className="mt-2 text-3xl font-bold">{value}</h3>
        </div>
    </div>
);

const AdminDashboard = () => {
    return (
        <div className="space-y-10">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
                <p className="text-muted-foreground mt-2">Welcome back! Here's what's happening today.</p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
                <StatsCard title="Total Projects" value="48" change="+12%" icon={<Briefcase className="size-6" />} trend="up" />
                <StatsCard title="Articles Published" value="124" change="+5%" icon={<FileText className="size-6" />} trend="up" />
                <StatsCard title="New Leads" value="32" change="-2%" icon={<MessageSquare className="size-6" />} trend="down" />
                <StatsCard title="Unique Visitors" value="8.4K" change="+18%" icon={<TrendingUp className="size-6" />} trend="up" />
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Recent Activities */}
                <div className="lg:col-span-2 rounded-3xl border border-border bg-card p-8 shadow-sm">
                    <div className="mb-8 flex items-center justify-between">
                         <h3 className="text-xl font-bold">Recent Projects</h3>
                         <button className="text-sm font-bold text-primary uppercase tracking-widest hover:underline">View All</button>
                    </div>
                    <div className="space-y-6">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="flex items-center justify-between border-b border-border pb-6 last:border-0 last:pb-0">
                                <div className="flex items-center gap-4">
                                    <div className="size-14 rounded-xl bg-muted overflow-hidden">
                                        <div className="h-full w-full bg-primary/20" />
                                    </div>
                                    <div>
                                        <p className="font-bold">E-commerce Backend System</p>
                                        <p className="text-xs text-muted-foreground">Updated 2 hours ago</p>
                                    </div>
                                </div>
                                <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-500">Completed</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Quick Notifications / Logs */}
                <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                     <h3 className="mb-8 text-xl font-bold">System Logs</h3>
                     <div className="space-y-6">
                        {[
                            { msg: "New project created", time: "5m ago", icon: <Clock className="size-4" /> },
                            { msg: "Database backup successful", time: "1h ago", icon: <TrendingUp className="size-4" /> },
                            { msg: "New contact message", time: "3h ago", icon: <MessageSquare className="size-4" /> },
                        ].map((log, i) => (
                            <div key={i} className="flex gap-4">
                                <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
                                    {log.icon}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{log.msg}</p>
                                    <p className="text-xs text-muted-foreground">{log.time}</p>
                                </div>
                            </div>
                        ))}
                     </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
