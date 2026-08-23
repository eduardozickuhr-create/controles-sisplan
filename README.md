# Controles Sisplan

Sistema pessoal para organizar relatórios/telas do Sisplan, incluindo:
- nome da tela;
- nome do formulário;
- arquivo `.FR3`;
- print/imagem;
- observações;
- tags;
- favoritos;
- busca;
- backup/importação.

## Primeiro relatório já incluído
- Tela: `APP - FICHA TÉCNICA`
- Form: `FichaTecnica`
- Arquivo: `assets/FichaTecnica.fr3`

## Como abrir no computador
Para teste simples, abra `index.html`.

Para testar corretamente a instalação como PWA, rode uma pasta em servidor local:
`python -m http.server 8080`
e abra `http://localhost:8080`.

## Como publicar e ter um link
### Opção mais fácil: Netlify
1. Entre em https://app.netlify.com/
2. Crie uma conta.
3. Use a opção de publicar um site manualmente ("Deploy manually").
4. Arraste a pasta deste projeto ou o ZIP descompactado.
5. O Netlify cria um link do tipo `https://seu-site.netlify.app`.
6. Você pode trocar o nome do endereço nas configurações do site.

### No iPhone
1. Abra o link publicado no Safari.
2. Toque em Compartilhar.
3. Escolha "Adicionar à Tela de Início".
4. O sistema ficará com ícone, funcionando como um app.

## Importante sobre armazenamento
Esta V1 salva novos relatórios/prints no IndexedDB do navegador.
Ou seja:
- o relatório inicial acompanha o site;
- novos itens ficam salvos naquele navegador/dispositivo;
- use "Backup" para exportar os dados e importar em outro dispositivo.

Para sincronizar automaticamente PC + iPhone + outros computadores, a evolução recomendada é ligar este mesmo layout a Supabase ou Firebase.
