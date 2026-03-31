import type { ThemeNote } from 'vuepress-theme-plume'
import { defineNoteConfig } from 'vuepress-theme-plume'

export const Guide: ThemeNote = defineNoteConfig({
    dir: 'guide',
    link: '/guide/',
    sidebar: [
        {
            text: '快速上手',
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
            text: '功能模块',
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
            text: '性能测评',
            collapsed: false,
            icon: 'carbon:meter-alt',
            prefix: 'benchmark',
            items: [
                'quickstart',
                'evaluate',
            ],
        },
        {
            text: '进阶配置',
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
