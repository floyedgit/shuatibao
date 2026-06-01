<script lang="ts">
    import { onMount } from "svelte";
    import "./app.css";

    import IconBook2 from "@tabler/icons-svelte/icons/book-2";
    import IconClipboardCheck from "@tabler/icons-svelte/icons/clipboard-check";
    import IconHome2 from "@tabler/icons-svelte/icons/home-2";
    import IconListDetails from "@tabler/icons-svelte/icons/list-details";
    import IconRefresh from "@tabler/icons-svelte/icons/refresh";
    import IconShuffle from "@tabler/icons-svelte/icons/arrows-random";
    import IconTrash from "@tabler/icons-svelte/icons/trash";
    import IconX from "@tabler/icons-svelte/icons/x";

    import { createSource } from "./source";
    import type { Question, QuestionType } from "./types";
    import {
        APP_TITLE,
        EXAM_QUESTION_COUNT,
        countQuestionTypes,
        createDefaultSimpleState,
        formatElapsed,
        formatQuestionAnswer,
        gradeExam,
        isAnswerCorrect,
        pickExamQuestions,
        recordWrongAnswer,
        recordWrongAnswers,
        removeWrongQuestion,
        type AnswerMap,
        type ExamResult,
        type SimpleState,
    } from "./features/simpleQuiz";

    type View = "home" | "practice" | "exam" | "wrong" | "bank";
    type PracticeMode = "sequential" | "random" | "wrong";
    type ExamStatus = "idle" | "running" | "finished";

    const source = createSource();
    const bank = source.getActiveBank();
    const questions = bank?.questions ?? [];
    const questionById = new Map(questions.map((q) => [q.id, q]));
    const counts = countQuestionTypes(questions);
    const storageKey = `shuatibao:simple:${bank?.hash ?? "empty"}`;

    let appState = $state<SimpleState>(createDefaultSimpleState());
    let activeView = $state<View>("home");
    let practiceMode = $state<PracticeMode>("sequential");
    let currentQuestion = $state<Question | null>(questions[0] ?? null);
    let selectedAnswers = $state<number[]>([]);
    let showResult = $state(false);
    let isCurrentCorrect = $state(false);

    let examStatus = $state<ExamStatus>("idle");
    let examQuestions = $state<Question[]>([]);
    let examIndex = $state(0);
    let examAnswers = $state<AnswerMap>({});
    let examStartedAt = $state<number | null>(null);
    let now = $state(Date.now());
    let examResult = $state<ExamResult | null>(null);

    let bankTypeFilter = $state<QuestionType | "all">("all");
    let bankCategoryFilter = $state("all");
    let expandedBankId = $state<string | null>(null);

    const categories = [
        ...new Set(questions.map((q) => q.category).filter(Boolean) as string[]),
    ];

    const wrongQuestions = $derived(
        appState.wrongIds
            .map((id) => questionById.get(id))
            .filter(Boolean) as Question[],
    );

    const examElapsedMs = $derived(
        examStartedAt === null
            ? (examResult?.elapsedMs ?? 0)
            : now - examStartedAt,
    );

    const filteredBankQuestions = $derived(
        questions.filter((question) => {
            const typeOk =
                bankTypeFilter === "all" || question.type === bankTypeFilter;
            const categoryOk =
                bankCategoryFilter === "all" ||
                question.category === bankCategoryFilter;
            return typeOk && categoryOk;
        }),
    );

    onMount(() => {
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                appState = {
                    ...createDefaultSimpleState(),
                    ...JSON.parse(saved),
                };
            }
        } catch {
            appState = createDefaultSimpleState();
        }

        currentQuestion =
            questions[Math.min(appState.sequentialIndex, questions.length - 1)] ??
            null;

        const timer = window.setInterval(() => {
            now = Date.now();
        }, 1000);
        return () => window.clearInterval(timer);
    });

    $effect(() => {
        localStorage.setItem(storageKey, JSON.stringify(appState));
    });

    function setState(next: SimpleState): void {
        appState = next;
    }

    function resetAnswer(): void {
        selectedAnswers = [];
        showResult = false;
        isCurrentCorrect = false;
    }

    function openView(view: View): void {
        activeView = view;
    }

    function startSequential(): void {
        practiceMode = "sequential";
        currentQuestion =
            questions[Math.min(appState.sequentialIndex, questions.length - 1)] ??
            null;
        resetAnswer();
        openView("practice");
    }

    function startRandom(): void {
        practiceMode = "random";
        currentQuestion =
            questions[Math.floor(Math.random() * questions.length)] ?? null;
        resetAnswer();
        openView("practice");
    }

    function startWrongPractice(question?: Question): void {
        practiceMode = "wrong";
        currentQuestion = question ?? wrongQuestions[0] ?? null;
        resetAnswer();
        openView("practice");
    }

    function toggleAnswer(index: number): void {
        if (showResult || !currentQuestion) return;
        if (currentQuestion.type === "single") {
            selectedAnswers = [index];
            return;
        }
        selectedAnswers = selectedAnswers.includes(index)
            ? selectedAnswers.filter((item) => item !== index)
            : [...selectedAnswers, index];
    }

    function submitPractice(): void {
        if (!currentQuestion || selectedAnswers.length === 0) return;
        isCurrentCorrect = isAnswerCorrect(currentQuestion, selectedAnswers);
        showResult = true;
        if (!isCurrentCorrect) {
            setState(recordWrongAnswer(appState, currentQuestion.id));
        }
    }

    function nextPractice(): void {
        if (practiceMode === "sequential") {
            const nextIndex = Math.min(
                appState.sequentialIndex + 1,
                questions.length - 1,
            );
            setState({ ...appState, sequentialIndex: nextIndex });
            currentQuestion = questions[nextIndex] ?? null;
        } else if (practiceMode === "random") {
            currentQuestion =
                questions[Math.floor(Math.random() * questions.length)] ?? null;
        } else {
            const index = wrongQuestions.findIndex(
                (q) => q.id === currentQuestion?.id,
            );
            currentQuestion =
                wrongQuestions[(index + 1) % Math.max(wrongQuestions.length, 1)] ??
                null;
        }
        resetAnswer();
    }

    function startExam(): void {
        examQuestions = pickExamQuestions(questions, EXAM_QUESTION_COUNT);
        examAnswers = {};
        examIndex = 0;
        examResult = null;
        examStartedAt = Date.now();
        examStatus = "running";
        openView("exam");
    }

    function toggleExamAnswer(index: number): void {
        const question = examQuestions[examIndex];
        if (!question || examStatus !== "running") return;
        const current = examAnswers[question.id] ?? [];
        const next =
            question.type === "single"
                ? [index]
                : current.includes(index)
                  ? current.filter((item) => item !== index)
                  : [...current, index];
        examAnswers = { ...examAnswers, [question.id]: next };
    }

    function finishExam(): void {
        if (!examStartedAt) return;
        const result = gradeExam(examQuestions, examAnswers, Date.now() - examStartedAt);
        examResult = result;
        examStatus = "finished";
        examStartedAt = null;
        setState({
            ...recordWrongAnswers(appState, result.wrongIds),
            lastExam: result,
        });
    }

    function clearWrong(questionId: string): void {
        setState(removeWrongQuestion(appState, questionId));
        if (currentQuestion?.id === questionId && practiceMode === "wrong") {
            currentQuestion = wrongQuestions.find((q) => q.id !== questionId) ?? null;
            resetAnswer();
        }
    }

    function questionTypeLabel(type: QuestionType): string {
        return type === "single"
            ? "单选"
            : type === "multiple"
              ? "多选"
              : type === "judgment"
                ? "判断"
                : "填空";
    }

    function navClass(view: View): string {
        return activeView === view
            ? "text-emerald-700 bg-emerald-50"
            : "text-slate-500";
    }
</script>

<svelte:head>
    <title>{APP_TITLE}</title>
</svelte:head>

<div class="min-h-0 flex-1 overflow-y-auto bg-[#f6f8f7] pb-24 text-slate-900">
    <main class="mx-auto flex min-h-full w-full max-w-3xl flex-col px-4 py-4">
        {#if activeView === "home"}
            <section class="space-y-4">
                <div class="rounded-[28px] bg-emerald-900 px-6 py-7 text-white shadow-lg">
                    <p class="text-sm text-emerald-100">内置题库 · 单文件练习</p>
                    <h1 class="mt-2 text-3xl font-semibold tracking-normal">
                        {APP_TITLE}
                    </h1>
                    <p class="mt-3 max-w-xl text-sm leading-6 text-emerald-50">
                        顺序练、随机练、模拟考和错题巩固都在本机浏览器保存，打开
                        HTML 即可使用。
                    </p>
                    <div class="mt-6 grid grid-cols-3 gap-2 text-center">
                        <div class="rounded-2xl bg-white/12 p-3">
                            <div class="text-2xl font-semibold">{counts.total}</div>
                            <div class="text-xs text-emerald-100">总题数</div>
                        </div>
                        <div class="rounded-2xl bg-white/12 p-3">
                            <div class="text-2xl font-semibold">{counts.single}</div>
                            <div class="text-xs text-emerald-100">单选</div>
                        </div>
                        <div class="rounded-2xl bg-white/12 p-3">
                            <div class="text-2xl font-semibold">{counts.multiple}</div>
                            <div class="text-xs text-emerald-100">多选</div>
                        </div>
                    </div>
                </div>

                <div class="grid gap-3 sm:grid-cols-3">
                    <button class="primary-action" type="button" onclick={startSequential}>
                        <IconListDetails size={22} /> 顺序刷题
                    </button>
                    <button class="primary-action" type="button" onclick={startRandom}>
                        <IconShuffle size={22} /> 随机刷题
                    </button>
                    <button class="primary-action" type="button" onclick={startExam}>
                        <IconClipboardCheck size={22} /> 模拟考试
                    </button>
                </div>

                <div class="grid gap-3 sm:grid-cols-2">
                    <div class="info-card">
                        <p class="text-sm text-slate-500">错题本</p>
                        <p class="mt-2 text-2xl font-semibold">
                            {appState.wrongIds.length} 题
                        </p>
                        <button
                            class="mt-4 text-sm font-medium text-emerald-700"
                            type="button"
                            onclick={() => openView("wrong")}
                        >
                            查看错题
                        </button>
                    </div>
                    <div class="info-card">
                        <p class="text-sm text-slate-500">最近考试</p>
                        {#if appState.lastExam}
                            <p class="mt-2 text-2xl font-semibold">
                                {appState.lastExam.score} 分
                            </p>
                            <p class="mt-1 text-sm text-slate-500">
                                {appState.lastExam.correct}/{appState.lastExam.total}
                                · 用时 {formatElapsed(appState.lastExam.elapsedMs)}
                            </p>
                        {:else}
                            <p class="mt-2 text-lg font-semibold">暂无记录</p>
                            <p class="mt-1 text-sm text-slate-500">
                                完成一次模拟考试后显示成绩。
                            </p>
                        {/if}
                    </div>
                </div>
            </section>
        {:else if activeView === "practice"}
            <section class="space-y-4">
                <div class="page-title">
                    <div>
                        <p class="text-sm text-slate-500">
                            {practiceMode === "sequential"
                                ? `顺序刷题 · 第 ${appState.sequentialIndex + 1} 题`
                                : practiceMode === "random"
                                  ? "随机刷题"
                                  : "错题练习"}
                        </p>
                        <h2>练习</h2>
                    </div>
                    <button class="ghost-button" type="button" onclick={nextPractice}>
                        <IconRefresh size={18} /> 换一题
                    </button>
                </div>
                {#if currentQuestion}
                    <article class="question-card">
                        <div class="mb-3 flex items-center gap-2">
                            <span class="type-pill">{questionTypeLabel(currentQuestion.type)}</span>
                            {#if currentQuestion.category}
                                <span class="category-pill">{currentQuestion.category}</span>
                            {/if}
                        </div>
                        <h3>{currentQuestion.question}</h3>
                        <div class="mt-5 space-y-3">
                            {#each currentQuestion.options ?? [] as option, index}
                                <button
                                    type="button"
                                    class:selected={selectedAnswers.includes(index)}
                                    class="option-button"
                                    onclick={() => toggleAnswer(index)}
                                >
                                    <span>{String.fromCharCode(65 + index)}</span>
                                    <b>{option.text}</b>
                                </button>
                            {/each}
                        </div>
                        {#if showResult}
                            <div class={isCurrentCorrect ? "result-ok" : "result-bad"}>
                                {isCurrentCorrect ? "回答正确" : "回答错误"} · 正确答案：
                                {formatQuestionAnswer(currentQuestion)}
                            </div>
                        {/if}
                        <div class="mt-5 flex gap-3">
                            <button class="solid-button" type="button" onclick={submitPractice}>
                                提交答案
                            </button>
                            <button class="outline-button" type="button" onclick={nextPractice}>
                                下一题
                            </button>
                        </div>
                    </article>
                {:else}
                    <div class="empty-state">暂无可练习题目。</div>
                {/if}
            </section>
        {:else if activeView === "exam"}
            <section class="space-y-4">
                <div class="page-title">
                    <div>
                        <p class="text-sm text-slate-500">25 题随机抽取 · 正向计时</p>
                        <h2>模拟考试</h2>
                    </div>
                    <div class="timer">{formatElapsed(examElapsedMs)}</div>
                </div>
                {#if examStatus === "idle"}
                    <div class="info-card text-center">
                        <p class="text-lg font-semibold">准备开始模拟考试</p>
                        <p class="mt-2 text-sm text-slate-500">
                            本次随机抽取 {Math.min(EXAM_QUESTION_COUNT, questions.length)}
                            道题，不限时，只记录用时。
                        </p>
                        <button class="solid-button mt-5" type="button" onclick={startExam}>
                            开始考试
                        </button>
                    </div>
                {:else if examStatus === "running"}
                    {@const examQuestion = examQuestions[examIndex]}
                    {#if examQuestion}
                        <article class="question-card">
                            <p class="text-sm text-slate-500">
                                第 {examIndex + 1}/{examQuestions.length} 题
                            </p>
                            <h3 class="mt-3">{examQuestion.question}</h3>
                            <div class="mt-5 space-y-3">
                                {#each examQuestion.options ?? [] as option, index}
                                    <button
                                        type="button"
                                        class:selected={(examAnswers[examQuestion.id] ?? []).includes(index)}
                                        class="option-button"
                                        onclick={() => toggleExamAnswer(index)}
                                    >
                                        <span>{String.fromCharCode(65 + index)}</span>
                                        <b>{option.text}</b>
                                    </button>
                                {/each}
                            </div>
                            <div class="mt-5 flex gap-3">
                                <button
                                    class="outline-button"
                                    type="button"
                                    disabled={examIndex === 0}
                                    onclick={() => (examIndex = Math.max(0, examIndex - 1))}
                                >
                                    上一题
                                </button>
                                {#if examIndex < examQuestions.length - 1}
                                    <button
                                        class="solid-button"
                                        type="button"
                                        onclick={() => (examIndex += 1)}
                                    >
                                        下一题
                                    </button>
                                {:else}
                                    <button class="solid-button" type="button" onclick={finishExam}>
                                        交卷
                                    </button>
                                {/if}
                            </div>
                        </article>
                    {/if}
                {:else if examResult}
                    <div class="info-card">
                        <p class="text-sm text-slate-500">考试结果</p>
                        <p class="mt-2 text-3xl font-semibold">{examResult.score} 分</p>
                        <p class="mt-1 text-sm text-slate-500">
                            答对 {examResult.correct}/{examResult.total} · 用时
                            {formatElapsed(examResult.elapsedMs)}
                        </p>
                        <button class="solid-button mt-5" type="button" onclick={startExam}>
                            再考一次
                        </button>
                    </div>
                    <div class="space-y-3">
                        {#each examQuestions.filter((q) => examResult?.wrongIds.includes(q.id)) as question}
                            <article class="mini-card">
                                <p>{question.question}</p>
                                <p class="mt-2 text-sm text-rose-700">
                                    正确答案：{formatQuestionAnswer(question)}
                                </p>
                            </article>
                        {/each}
                    </div>
                {/if}
            </section>
        {:else if activeView === "wrong"}
            <section class="space-y-4">
                <div class="page-title">
                    <div>
                        <p class="text-sm text-slate-500">自动收录，可手动移除</p>
                        <h2>错题本</h2>
                    </div>
                    <span class="count-badge">{wrongQuestions.length} 题</span>
                </div>
                {#if wrongQuestions.length === 0}
                    <div class="empty-state">当前没有错题。</div>
                {:else}
                    {#each wrongQuestions as question}
                        <article class="mini-card">
                            <div class="flex items-start justify-between gap-3">
                                <p>{question.question}</p>
                                <button
                                    class="icon-button"
                                    type="button"
                                    aria-label="移出错题本"
                                    onclick={() => clearWrong(question.id)}
                                >
                                    <IconX size={17} />
                                </button>
                            </div>
                            <p class="mt-2 text-sm text-slate-500">
                                正确答案：{formatQuestionAnswer(question)}
                            </p>
                            <button
                                class="mt-3 text-sm font-medium text-emerald-700"
                                type="button"
                                onclick={() => startWrongPractice(question)}
                            >
                                重新练习
                            </button>
                        </article>
                    {/each}
                {/if}
            </section>
        {:else if activeView === "bank"}
            <section class="space-y-4">
                <div class="page-title">
                    <div>
                        <p class="text-sm text-slate-500">全部题目与答案</p>
                        <h2>题库查看</h2>
                    </div>
                    <span class="count-badge">{filteredBankQuestions.length} 题</span>
                </div>
                <div class="filter-row">
                    <select bind:value={bankTypeFilter}>
                        <option value="all">全部题型</option>
                        <option value="single">单选</option>
                        <option value="multiple">多选</option>
                    </select>
                    <select bind:value={bankCategoryFilter}>
                        <option value="all">全部分类</option>
                        {#each categories as category}
                            <option value={category}>{category}</option>
                        {/each}
                    </select>
                </div>
                {#each filteredBankQuestions as question, index}
                    <article class="mini-card">
                        <button
                            class="w-full text-left"
                            type="button"
                            onclick={() =>
                                (expandedBankId =
                                    expandedBankId === question.id ? null : question.id)}
                        >
                            <p class="text-xs text-slate-500">
                                {index + 1}. {questionTypeLabel(question.type)}
                            </p>
                            <p class="mt-1 font-medium">{question.question}</p>
                        </button>
                        {#if expandedBankId === question.id}
                            <div class="mt-3 space-y-2 border-t border-slate-100 pt-3">
                                {#each question.options ?? [] as option, optionIndex}
                                    <p class="text-sm text-slate-600">
                                        {String.fromCharCode(65 + optionIndex)}. {option.text}
                                    </p>
                                {/each}
                                <p class="text-sm font-medium text-emerald-700">
                                    答案：{formatQuestionAnswer(question)}
                                </p>
                            </div>
                        {/if}
                    </article>
                {/each}
            </section>
        {/if}
    </main>
</div>

<nav class="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 px-2 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur">
    <div class="mx-auto grid max-w-3xl grid-cols-5 gap-1 py-2">
        <button class={navClass("home")} type="button" onclick={() => openView("home")}>
            <IconHome2 size={21} /> 首页
        </button>
        <button class={navClass("practice")} type="button" onclick={startSequential}>
            <IconListDetails size={21} /> 刷题
        </button>
        <button class={navClass("exam")} type="button" onclick={() => openView("exam")}>
            <IconClipboardCheck size={21} /> 考试
        </button>
        <button class={navClass("wrong")} type="button" onclick={() => openView("wrong")}>
            <IconTrash size={21} /> 错题
        </button>
        <button class={navClass("bank")} type="button" onclick={() => openView("bank")}>
            <IconBook2 size={21} /> 题库
        </button>
    </div>
</nav>

<style>
    :global(body) {
        background: #f6f8f7;
    }

    nav button {
        display: inline-flex;
        min-width: 0;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 3px;
        border-radius: 14px;
        padding: 8px 4px;
        font-size: 12px;
        font-weight: 600;
        transition:
            color 0.2s ease,
            background 0.2s ease;
    }

    h2 {
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 0;
    }

    h3 {
        font-size: 20px;
        font-weight: 650;
        line-height: 1.55;
        letter-spacing: 0;
    }

    .primary-action,
    .solid-button,
    .outline-button,
    .ghost-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        border-radius: 18px;
        font-weight: 650;
        transition:
            transform 0.2s ease,
            background 0.2s ease,
            border-color 0.2s ease;
    }

    .primary-action {
        min-height: 72px;
        background: white;
        color: #065f46;
        box-shadow: 0 10px 24px rgba(15, 23, 42, 0.06);
    }

    .solid-button {
        min-height: 44px;
        flex: 1;
        background: #047857;
        padding: 0 18px;
        color: white;
    }

    .outline-button,
    .ghost-button {
        min-height: 44px;
        border: 1px solid #cbd5e1;
        background: white;
        padding: 0 18px;
        color: #0f172a;
    }

    .ghost-button {
        flex: none;
        min-height: 38px;
        border-color: transparent;
        color: #047857;
    }

    .solid-button:disabled,
    .outline-button:disabled {
        opacity: 0.45;
    }

    .info-card,
    .question-card,
    .mini-card,
    .empty-state {
        border: 1px solid rgba(203, 213, 225, 0.72);
        border-radius: 24px;
        background: white;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
    }

    .info-card,
    .empty-state {
        padding: 20px;
    }

    .question-card {
        padding: 22px;
    }

    .mini-card {
        padding: 16px;
    }

    .empty-state {
        color: #64748b;
        text-align: center;
    }

    .page-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
    }

    .type-pill,
    .category-pill,
    .count-badge {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 5px 10px;
        font-size: 12px;
        font-weight: 650;
    }

    .type-pill,
    .count-badge {
        background: #d1fae5;
        color: #065f46;
    }

    .category-pill {
        background: #f1f5f9;
        color: #475569;
    }

    .option-button {
        display: grid;
        width: 100%;
        grid-template-columns: 34px 1fr;
        align-items: center;
        gap: 12px;
        border: 1px solid #e2e8f0;
        border-radius: 18px;
        background: #fff;
        padding: 12px;
        text-align: left;
    }

    .option-button span {
        display: inline-flex;
        height: 34px;
        width: 34px;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #f1f5f9;
        color: #334155;
        font-weight: 700;
    }

    .option-button b {
        font-weight: 550;
        line-height: 1.5;
    }

    .option-button.selected {
        border-color: #059669;
        background: #ecfdf5;
    }

    .option-button.selected span {
        background: #047857;
        color: white;
    }

    .result-ok,
    .result-bad {
        margin-top: 18px;
        border-radius: 16px;
        padding: 12px;
        font-size: 14px;
        font-weight: 650;
    }

    .result-ok {
        background: #ecfdf5;
        color: #047857;
    }

    .result-bad {
        background: #fff1f2;
        color: #be123c;
    }

    .timer {
        border-radius: 16px;
        background: #0f172a;
        padding: 8px 12px;
        color: white;
        font-size: 18px;
        font-weight: 750;
        font-variant-numeric: tabular-nums;
    }

    .icon-button {
        display: inline-flex;
        height: 34px;
        width: 34px;
        flex: 0 0 auto;
        align-items: center;
        justify-content: center;
        border-radius: 999px;
        background: #f8fafc;
        color: #64748b;
    }

    .filter-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .filter-row select {
        min-width: 0;
        border: 1px solid #cbd5e1;
        border-radius: 14px;
        background: white;
        padding: 10px 12px;
        color: #0f172a;
    }
</style>
