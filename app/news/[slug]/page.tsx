import {cookies} from 'next/headers';
import {notFound} from 'next/navigation';
import {publicArticle} from '@/lib/neuron-server';
import Article from './reader';
export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props){const {slug}=await params;const demo=(await cookies()).get('neuron_demo')?.value;const post:any=await publicArticle(slug,demo);return {title:post?`${post.title} — Нейрон`:'Публикация не найдена — Нейрон',description:post?.excerpt,robots:demo?{index:false,follow:false}:undefined,openGraph:post?{title:post.title,description:post.excerpt,type:'article',locale:'ru_RU'}:undefined};}
export default async function NewsPage({params}:Props){const {slug}=await params;const demo=(await cookies()).get('neuron_demo')?.value;const post:any=await publicArticle(slug,demo);if(!post)notFound();return <Article post={post} isDemo={!!demo}/>;}
