import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import {
    Copy, Download, CheckCircle,
    BarChart3, Clock, Hash, TrendingUp, Zap, ChevronDown, ChevronUp, Share2, FileText, Sparkles
} from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export default function BlogOutput({ blog }) {
    const [copied, setCopied] = useState(false)
    const [showScore, setShowScore] = useState(true)

    const seoScore = blog.seo_score ?? blog.seoScore ?? 0
    const readTime = blog.read_time ?? blog.readTime ?? 0
    const wordCount = blog.word_count ?? blog.wordCount ?? 0

    const handleCopy = async () => {
        await navigator.clipboard.writeText(blog.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        const blob = new Blob([blog.content], { type: 'text/markdown' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${blog.title.slice(0, 40).replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`
        a.click()
        URL.revokeObjectURL(url)
    }

    const getScoreColor = (score) => {
        if (score >= 90) return "text-emerald-500"
        if (score >= 80) return "text-primary"
        return "text-orange-500"
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Success Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-dashed">
                <div className="space-y-4">
                    <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                        <CheckCircle size={10} />
                        AI-Optimized Draft
                    </div>
                    <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground leading-tight max-w-2xl">
                        {blog.title}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button variant="outline" onClick={handleDownload} className="h-10 px-5 rounded-xl text-xs font-bold gap-2">
                        <Download size={14} />
                        Export .md
                    </Button>
                    <Button
                        onClick={handleCopy}
                        className={cn(
                            "h-10 px-8 rounded-xl text-xs font-bold gap-2 transition-all shadow-lg shadow-primary/10",
                            copied ? "bg-emerald-500/90 hover:bg-emerald-500 shadow-emerald-500/20" : "bg-primary/90 hover:bg-primary shadow-primary/20"
                        )}
                    >
                        {copied ? (
                            <>
                                <CheckCircle size={14} />
                                Copied to Clipboard
                            </>
                        ) : (
                            <>
                                <Copy size={14} />
                                Copy Content
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Content Area */}
                <div className="lg:col-span-8 space-y-8">
                    <Card className="p-8 md:p-12 bento-card border-primary/5 shadow-2xl shadow-primary/5 min-h-[600px] bg-card/50">
                        <div className="flex items-center gap-1.5 mb-8 text-[11px] font-bold text-muted-foreground/50 uppercase tracking-[0.3em]">
                            <FileText size={12} />
                            Blog Content
                        </div>
                        <div className="prose max-w-none blog-content">
                            <ReactMarkdown
                                components={{
                                    h1: ({ children }) => (
                                        <h1 className="text-3xl font-black tracking-tight text-foreground mt-10 mb-4 pb-3 border-b border-border/40 first:mt-0">
                                            {children}
                                        </h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-2xl font-extrabold tracking-tight text-foreground mt-8 mb-3">
                                            {children}
                                        </h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-xl font-bold tracking-tight text-foreground mt-6 mb-2">
                                            {children}
                                        </h3>
                                    ),
                                    h4: ({ children }) => (
                                        <h4 className="text-lg font-bold text-foreground mt-5 mb-2">
                                            {children}
                                        </h4>
                                    ),
                                    h5: ({ children }) => (
                                        <h5 className="text-base font-bold text-foreground/90 mt-4 mb-1">
                                            {children}
                                        </h5>
                                    ),
                                    h6: ({ children }) => (
                                        <h6 className="text-sm font-bold uppercase tracking-wider text-primary mt-4 mb-1">
                                            {children}
                                        </h6>
                                    ),
                                    p: ({ children }) => (
                                        <p className="text-sm leading-7 text-muted-foreground font-medium mb-4">
                                            {children}
                                        </p>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="my-4 ml-5 space-y-1.5 list-disc marker:text-primary">
                                            {children}
                                        </ul>
                                    ),
                                    ol: ({ children }) => (
                                        <ol className="my-4 ml-5 space-y-1.5 list-decimal marker:text-primary marker:font-bold">
                                            {children}
                                        </ol>
                                    ),
                                    li: ({ children }) => (
                                        <li className="text-sm leading-7 text-muted-foreground font-medium pl-1">
                                            {children}
                                        </li>
                                    ),
                                    blockquote: ({ children }) => (
                                        <blockquote className="my-6 border-l-4 border-primary bg-primary/5 px-6 py-4 rounded-r-xl text-primary font-bold text-sm italic">
                                            {children}
                                        </blockquote>
                                    ),
                                    code: ({ inline, children }) =>
                                        inline ? (
                                            <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded text-[0.82em] font-mono font-semibold">
                                                {children}
                                            </code>
                                        ) : (
                                            <code className="font-mono text-xs">{children}</code>
                                        ),
                                    pre: ({ children }) => (
                                        <pre className="my-4 bg-muted/40 border border-border/50 rounded-2xl p-5 overflow-x-auto text-xs font-mono leading-relaxed">
                                            {children}
                                        </pre>
                                    ),
                                    table: ({ children }) => (
                                        <div className="my-6 overflow-x-auto rounded-xl border border-border/50">
                                            <table className="w-full text-xs border-collapse">{children}</table>
                                        </div>
                                    ),
                                    thead: ({ children }) => (
                                        <thead className="bg-muted/50">{children}</thead>
                                    ),
                                    th: ({ children }) => (
                                        <th className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground border-b border-border/50">
                                            {children}
                                        </th>
                                    ),
                                    td: ({ children }) => (
                                        <td className="px-4 py-3 text-sm text-muted-foreground font-medium border-b border-border/20">
                                            {children}
                                        </td>
                                    ),
                                    hr: () => (
                                        <hr className="my-8 border-border/40 border-dashed" />
                                    ),
                                    a: ({ href, children }) => (
                                        <a
                                            href={href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-primary font-semibold underline underline-offset-4 decoration-primary/40 hover:decoration-primary transition-colors"
                                        >
                                            {children}
                                        </a>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-bold text-foreground">{children}</strong>
                                    ),
                                    em: ({ children }) => (
                                        <em className="italic text-muted-foreground/80">{children}</em>
                                    ),
                                }}
                            >
                                {blog.content}
                            </ReactMarkdown>
                        </div>
                    </Card>
                </div>

                {/* Right: Intelligence Panel */}
                <div className="lg:col-span-4 space-y-6">
                    {/* Score Card */}
                    <Card className="p-6 bento-card border-primary/10 bg-gradient-to-br from-card to-background relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:bg-primary/10 transition-colors" />

                        <div className="flex items-center justify-between mb-8">
                            <div className="space-y-1">
                                <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">SEO Index</h4>
                                <p className="text-xs font-medium text-muted-foreground/60">Keyword coverage score</p>
                            </div>
                            <div className={cn("text-3xl font-black tracking-tighter cinematic-glow", getScoreColor(seoScore))}>
                                {seoScore}%
                            </div>
                        </div>

                        <div className="space-y-4 relative">
                            <Progress value={seoScore} className="h-2 bg-muted rounded-full overflow-hidden" />
                            <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                <span className="text-muted-foreground/60">Semantic Depth</span>
                                <span className="text-primary">Optimized</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-dashed">
                            <div className="space-y-1">
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest block">Read Time</span>
                                <span className="text-sm font-bold flex items-center gap-2">
                                    <Clock size={12} className="text-primary" />
                                    {readTime} Min
                                </span>
                            </div>
                            <div className="space-y-1 text-right">
                                <span className="text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest block">Word Count</span>
                                <span className="text-sm font-bold flex items-center justify-end gap-2">
                                    <Hash size={12} className="text-primary" />
                                    {wordCount.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </Card>

                    {/* Keywords Card */}
                    <Card className="p-6 bento-card border-muted/50">
                        <div className="flex items-center justify-between mb-6">
                            <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">SERP Target Keywords</h4>
                            <Sparkles size={14} className="text-primary/40" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {blog.keywords && blog.keywords.length > 0 ? blog.keywords.map((kw, i) => (
                                <Badge key={i} variant="secondary" className="bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-tighter text-muted-foreground/80 hover:bg-primary/5 hover:text-primary transition-all border-none">
                                    {kw}
                                </Badge>
                            )) : <span className="text-[10px] text-muted-foreground/60 italic font-medium">No keywords provided</span>}
                        </div>
                    </Card>

                    {/* SEO Intelligence Card */}
                    {(blog.most_searched_query || (blog.most_searched_questions && blog.most_searched_questions.length > 0) || (blog.top3_ranked_websites && blog.top3_ranked_websites.length > 0) || blog.research_paper) && (
                        <Card className="p-6 bento-card border-muted/50 space-y-5">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Intelligence Data</h4>
                                <Zap size={14} className="text-primary/40" />
                            </div>

                            {blog.most_searched_query && (
                                <div className="space-y-2">
                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Most Searched Query</h5>
                                    <div className="text-xs font-bold text-foreground bg-primary/5 border border-primary/10 rounded-lg p-3 break-words">
                                        {blog.most_searched_query}
                                    </div>
                                </div>
                            )}

                            {blog.most_searched_questions && blog.most_searched_questions.length > 0 && (
                                <div className="space-y-2">
                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Top Questions</h5>
                                    <ul className="space-y-1.5 list-disc pl-4 marker:text-primary/50 text-[11px] font-medium text-muted-foreground leading-relaxed">
                                        {blog.most_searched_questions.map((q, i) => (
                                            <li key={i} className="break-words">{q}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {blog.top3_ranked_websites && blog.top3_ranked_websites.length > 0 && (
                                <div className="space-y-2">
                                    <h5 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Top Ranked Sites</h5>
                                    <ul className="space-y-1.5 list-disc pl-4 marker:text-primary/50 text-[11px] font-medium">
                                        {blog.top3_ranked_websites.map((url, i) => (
                                            <li key={i}>
                                                <a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline hover:text-primary/80 break-all transition-colors">
                                                    {url.replace(/^https?:\/\/(www\.)?/, '')}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {blog.research_paper && (
                                <details className="space-y-2 pt-2 border-t border-dashed group">
                                    <summary className="flex items-center gap-2 cursor-pointer list-none text-[11px] font-bold uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary/20 px-4 py-2.5 rounded-xl transition-colors justify-center">
                                        <FileText size={14} />
                                        View Research Paper
                                    </summary>
                                    <div className="mt-3 max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 text-[11px] leading-relaxed text-muted-foreground">
                                        {blog.research_paper}
                                    </div>
                                </details>
                            )}
                        </Card>
                    )}

                    {/* Pro Action Box */}
                    <div className="p-6 rounded-3xl bg-primary/5 text-foreground space-y-4 shadow-xl shadow-black/5 border border-primary/10 relative overflow-hidden group">
                        <div className="absolute bottom-0 right-0 opacity-5 translate-x-1/4 translate-y-1/4 rotate-12 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                            <Share2 size={160} />
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/10 group-hover:bg-primary/20 transition-colors">
                            <TrendingUp size={18} className="text-primary" />
                        </div>
                        <div>
                            <h4 className="text-sm font-extrabold tracking-tight mb-1">Built to be AI-cited</h4>
                            <p className="text-[11px] opacity-70 font-medium leading-relaxed">Direct-answer blocks, question headings, stats and named entities — structured so Google and AI search engines quote it.</p>
                        </div>
                        <Button variant="outline" className="w-full h-9 text-[10px] font-extrabold uppercase tracking-widest border-primary/20 hover:bg-primary/5 text-primary">
                            GenFlows Glass Box
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
