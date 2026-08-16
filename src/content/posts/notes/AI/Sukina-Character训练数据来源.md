---
title: Sukina-Character训练数据来源
description: Sukina-Character在训练过程中使用的数据来源与合规性声明
published: 2026-08-14
tags: ['Sukina', 'LLM_Training']
category: Notes
draft: false
---

# Dataset Procees Track

## 数据来源与合规性
Sukina-Lab始终尊重知识产权，我们在模型训练中使用了海量数据  

它们多为我们使用AI生成且根据提供商的使用协议，**我们拥有对这部分数据的所有权利，包括不受限制的使用/修改/再分发，以及用于模型训练**  
其余数据来自公开渠道，在遵守其开源协议、与原作者/版权方充分沟通（如有需要）的基础上，我们对部分进行了改写，以适应我们的训练需求  
我们公开在模型训练中，使用的这部分数据的清单，以及适用的训练阶段和原数据的发布者/版权方

大致上，模型的训练可以分为CPT、SFT、RL三阶段，使用的数据集如下：

### 用途尚待商讨(均暂未加入)
|来源/作者|数据范围|许可证|
|----|----|----|
|[WEIJIA12138/Nico](https://modelscope.cn/datasets/WEIJIA12138/Nico)|妮可 中文数据集|Apache-2.0|
|[qingzhang/Chinese_Historical_Heroes_Multi-turn_Dialogue_Dataset](https://modelscope.cn/datasets/qingzhang/Chinese_Historical_Heroes_Multi-turn_Dialogue_Dataset)|华夏群雄历史人物多轮对话数据集|Apache-2.0|
|[xuanxixue/HANA](https://modelscope.cn/datasets/xuanxixue/HANA)|HANA 中文闲聊对话数据集|Apache-2.0|
|[charlin55/Genshin_Irminsul_Dataset](https://huggingface.co/datasets/charlin55/Genshin_Irminsul_Dataset)|《原神》世界树知识库|MIT|


### 1.CPT Stage
|来源/作者|数据范围|许可证|
|----|----|----|
|[OmniData/LCCC](https://www.modelscope.cn/datasets/OmniData/LCCC)|难以分类|自定义许可证|
|[YIRONGCHEN/PsyDTCorpus](https://modelscope.cn/datasets/YIRONGCHEN/PsyDTCorpus/dataPeview)|心理咨询师数字孪生对话数据集|Apache-2.0|
|[YIRONGCHEN/SoulChat-R1](https://modelscope.cn/datasets/YIRONGCHEN/SoulChat-R1)|多轮心理健康思维链对话数据集|Apache-2.0|
|[YIRONGCHEN/SoulChatCorpus](https://modelscope.cn/datasets/YIRONGCHEN/SoulChatCorpus)|灵心大模型微调数据集|Apache-2.0|
|[SunVapor/PsyQA](https://www.modelscope.cn/datasets/SunVapor/PsyQA)|难以分类|Apache-2.0|

### 2.SFT Stage
|来源/作者|数据范围|许可证|
|----|----|----|
|夏冰月|三月七微调数据集|已获得许可|
|[bai-roleplay/evol-character-entire](https://huggingface.co/datasets/bai-roleplay/evol-character-entire)|Evol-character 角色扮演数据集|Apache-2.0|
|[Cheng Li @ SenseTime  (Chatharuhi老大，个人提供的数据)](https://github.com/lc1332)|很多|-|
|[Chat-Haruhi-Suzumiya](https://github.com/LC1332/Chat-Haruhi-Suzumiya)|（未加入）胡桃、神里凌华等几个女性角色的（部分）数据|Apache-2.0|
|[firefly123123/firefly](https://modelscope.cn/datasets/firefly123123/firefly)|流萤的部分数据|Apache-2.0|
|[Alnesti/Alour-basic-chat](https://modelscope.cn/datasets/Alnesti/Alour-basic-chat)|-（未加入）|CC-BY-NC-4.0|
|[himzhzx/muice-dataset-train.catgirl](https://modelscope.cn/datasets/himzhzx/muice-dataset-train.catgirl)|（未加入）沐雪猫娘化数据集|CC BY-NC-4.0|
|[Moemuu/Muice-Dataset](https://modelscope.cn/datasets/Moemuu/Muice-Dataset)|（未加入）沐雪（中文）训练集|CC BY-NC-4.0|
|RainmeoX|（未加入）绝区零 - 仪玄角色资料数据集|-?|
|[kmno4zx/huanhuan-chat](https://modelscope.cn/datasets/kmno4zx/huanhuan-chat)|（未加入）甄嬛对话集|Apache-2.0|
|[CharlinChen/Genshin_Irminsul_Nahida](https://modelscope.cn/datasets/CharlinChen/Genshin_Irminsul_Nahida)|（未加入）纳西妲角色扮演数据集|MIT|
|[Because66666/Nahida_dataset](https://modelscope.cn/datasets/Because66666/Nahida_dataset)|（未加入）纳西妲数据集|MIT|
|[heqirui/zhenhuanzhuan](https://modelscope.cn/datasets/heqirui/zhenhuanzhuan)|（未加入）甄嬛传角色数据集|Apache-2.0|

### 3.RL-KTO Stage
|来源/作者|数据范围|许可证|
|----|----|----|
|夏冰月|三月树洞网站真实用户问答数据（已脱敏）|已获得许可|