import { icons } from './icons.js?v=cloud-realm-study-29';

const nav=document.querySelector('.nav');
if(nav){
  const management=document.createElement('div');
  management.className='home-management';
  management.innerHTML=`<span>管理</span>
    <a href="index.html#library">${icons.tome}<b>藏书管理</b></a>
    <a href="index.html#studio">${icons.astrolabe}<b>AI 工坊</b></a>
    <a href="index.html#categories">${icons.scroll}<b>分类与标签</b></a>`;
  nav.append(management);
}
