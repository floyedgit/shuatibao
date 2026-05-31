<script lang="ts">
    import { onMount } from "svelte";
    import "./app.css";

    import QuizView from "./components/QuizView.svelte";
    import Sidebar from "./components/Sidebar.svelte";
    import HeaderSidebarTrigger from "./components/HeaderSidebarTrigger.svelte";
    import * as SidebarUI from "$lib/components/ui/sidebar";
    import * as Tooltip from "$lib/components/ui/tooltip";

    import { createSource } from "./source";
    import type { Bank } from "./source/types";

    // @ts-ignore
    import faviconRaw from "../icons/icon.svg?raw";
    const faviconUrl = `data:image/svg+xml,${encodeURIComponent(faviconRaw)}`;

    const source = createSource();
    const isLibrary = source.mode === "library";

    let activeBank = $state<Bank | null>(source.getActiveBank());

    onMount(() =>
        source.subscribe(() => {
            activeBank = source.getActiveBank();
        }),
    );
</script>

<svelte:head>
    <link rel="icon" type="image/svg+xml" href={faviconUrl} />
    <title>刷题宝</title>
</svelte:head>

{#snippet contentBody()}
    <header class="flex items-center gap-3 px-5 py-4 sm:px-8 sm:py-5">
        {#if isLibrary}
            <HeaderSidebarTrigger />
        {/if}
        <div
            class="mx-auto flex flex-col items-center leading-tight"
            aria-label="刷题宝"
        >
            <span class="text-foreground text-lg font-semibold tracking-normal"
                >刷题宝</span
            >
            <span class="text-muted-foreground text-xs"
                >手机本地题库练习</span
            >
        </div>
        {#if isLibrary}
            <span class="size-8" aria-hidden="true"></span>
        {/if}
    </header>

    {#if activeBank}
        {#key activeBank.hash}
            <QuizView bank={activeBank} />
        {/key}
    {:else}
        <main class="flex flex-1 flex-col items-center justify-center px-6">
            <div class="flex max-w-md flex-col items-center gap-4 text-center">
                <p class="text-foreground text-lg font-medium">还没有题库</p>
                <p class="text-muted-foreground text-sm leading-relaxed">
                    点击左上角菜单进入题库列表，导入 JSON 题库后即可开始练习。题库和进度只保存在当前手机浏览器。
                </p>
            </div>
        </main>
    {/if}
{/snippet}

{#if isLibrary}
    <SidebarUI.Provider open={false}>
        <Sidebar {source} />
        <SidebarUI.Inset>
            {@render contentBody()}
        </SidebarUI.Inset>
    </SidebarUI.Provider>
{:else}
    <Tooltip.Provider delayDuration={0}>
        <div class="flex h-full flex-col">
            {@render contentBody()}
        </div>
    </Tooltip.Provider>
{/if}
