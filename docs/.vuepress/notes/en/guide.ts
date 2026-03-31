import type { ThemeNote } from 'vuepress-theme-plume'
import { defineNoteConfig } from 'vuepress-theme-plume'

export const Guide: ThemeNote = defineNoteConfig({
    dir: 'guide',
    link: '/guide/',
    sidebar: [
        {
            text: 'Getting Started',
            collapsed: false,
            icon: 'carbon:idea',
            prefix: 'basicinfo',
            items: [
                'intro',
                'install',
                'architecture',
                'demo',
            ],
        },
        {
            text: 'Modules',
            collapsed: false,
            icon: 'carbon:assembly-cluster',
            prefix: 'modules',
            items: [
                'rag',
                'graphrag',
                'database',
                'skills',
                'memory',
            ],
        },
        {
            text: 'Benchmark',
            collapsed: false,
            icon: 'carbon:meter-alt',
            prefix: 'benchmark',
            items: [
                'quickstart',
                'evaluate',
            ],
        },
        {
            text: 'Advanced',
            collapsed: false,
            icon: 'carbon:settings-adjust',
            prefix: 'advanced',
            items: [
                'config',
                'data-format',
            ],
        },
    ],
})
