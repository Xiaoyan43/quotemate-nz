import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-white">
      <section className="w-full max-w-5xl text-center">
        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">QuoteMate NZ</h1>
        <p className="mt-6 text-lg text-zinc-300 sm:text-xl">
          给新西兰小企业的 AI 报价助手
        </p>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]">
            <div className="text-2xl">💬</div>
            <h2 className="mt-4 text-lg font-semibold text-white">30 秒生成报价</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              客户咨询一到，AI 自动生成结构化报价草稿
            </p>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]">
            <div className="text-2xl">📧</div>
            <h2 className="mt-4 text-lg font-semibold text-white">自动跟进不漏单</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              三天没回复？系统自动提醒你发 follow-up
            </p>
          </article>

          <article className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition duration-300 hover:-translate-y-1 hover:border-zinc-700 hover:shadow-[0_0_30px_rgba(255,255,255,0.08)]">
            <div className="text-2xl">📊</div>
            <h2 className="mt-4 text-lg font-semibold text-white">客户状态一目了然</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              新询盘、报价中、已成交——一个看板管清楚
            </p>
          </article>
        </div>
        <Link
          href="/login"
          className="mt-12 inline-flex items-center justify-center rounded-full bg-white px-8 py-3 text-base font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
        >
          开始使用
        </Link>
      </section>
    </main>
  );
}
