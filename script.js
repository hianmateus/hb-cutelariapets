// ============================================================
// FIREBASE CONFIG
// ============================================================

const firebaseConfig = {
    apiKey: "AIzaSyBJjLLf0xXnyT0lwE9WwYepaXGnnWprUpc",
    authDomain: "hb-cutelariapets.firebaseapp.com",
    projectId: "hb-cutelariapets",
    storageBucket: "hb-cutelariapets.firebasestorage.app",
    messagingSenderId: "692195779876",
    appId: "1:692195779876:web:6e7cfe6a1a64f53bcf7fb1"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();


// ============================================================
// CONFIGURAÇÕES FIXAS DA LANDING PAGE
// ============================================================

// ============================================================
// CONFIGURAÇÕES DA LANDING PAGE
// ============================================================

let NUMERO_WHATSAPP = "";
let CONFIG_RETIRADA = {
    dias: [],
    horaInicio: "08:00",
    horaFim: "18:00",
    intervalo: 60
};


// ============================================================
// VARIÁVEIS DO MODAL
// ============================================================

let produtoModalAtual = null;
let modalImagemAtual = 0;


// ============================================================
// APLICAÇÃO
// ============================================================

document.addEventListener("DOMContentLoaded", async () => {

    // ========================================================
    // SELETORES GLOBAIS
    // ========================================================

    const cartIcon = document.querySelector(".cart-icon");
    const cartSidebar = document.querySelector(".cart-sidebar");
    const cartOverlay = document.querySelector(".cart-overlay");
    const closeCartBtn = document.querySelector(".close-cart-btn");
    const cartBody = document.querySelector(".cart-body");
    const cartBadge = document.querySelector(".cart-badge");

    const deliveryToggleBtns =
        document.querySelectorAll(".delivery-btn");

    const deliveryForm =
        document.getElementById("delivery-form-container");

    const pickupForm =
        document.getElementById("pickup-form-container");

    const trocoContainer =
        document.getElementById("troco-container");

    const couponInput =
        document.getElementById("coupon-input");

    const applyCouponBtn =
        document.getElementById("apply-coupon-btn");

    const couponFeedback =
        document.getElementById("coupon-feedback");

    const subtotalElem =
        document.getElementById("cart-subtotal");

    const cartDiscountElem =
        document.getElementById("cart-discount");

    const discountLineElem =
        document.querySelector(".discount-line");

    const totalElem =
        document.getElementById("cart-total");

    const finishOrderBtn =
        document.getElementById("finish-order-btn");

    const viewCartBanner =
        document.querySelector(".view-cart-banner");

    const bannerTotalElem =
        document.getElementById("banner-total");

    const viewCartBannerBtn =
        document.querySelector(".view-cart-banner-btn");

    const categoryBtns =
        document.querySelectorAll(".category-btn");

    const searchInput =
        document.querySelector(".search-input");

    const productsContainer =
        document.querySelector(".products-container");


    // ========================================================
    // CARREGAR PRODUTOS DO FIREBASE
    // ========================================================

    let produtos = [];

    try {

        const snap = await db
            .collection("produtos")
            .where("ativo", "!=", false)
            .get();

        produtos = snap.docs
            .map(doc => ({
                ...doc.data()
            }))
            .sort((a, b) => Number(a.id) - Number(b.id));


        // Garantir estrutura correta dos produtos

        produtos = produtos.map(produto => ({

            ...produto,

            imagem: Array.isArray(produto.imagem)
                ? produto.imagem
                : produto.imagem
                    ? [produto.imagem]
                    : [],

            especificacoes:
                Array.isArray(produto.especificacoes)
                    ? produto.especificacoes
                    : [],

            nome:
                produto.nome || "",

            categoria:
                produto.categoria || "",

            marca:
                produto.marca || "",

            preco:
                Number(produto.preco) || 0,

            preco10x:
                Number(produto.preco10x) || 0,

            descricao:
                produto.descricao || "",

            descricaoLonga:
                produto.descricaoLonga || "",

            offer:
                produto.offer || ""

        }));

    } catch (e) {

        console.error(
            "Erro ao carregar produtos do Firebase:",
            e
        );

        if (productsContainer) {

            productsContainer.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 3rem;
                    color: #999;
                ">
                    <i
                        class="fa-solid fa-triangle-exclamation"
                        style="
                            font-size: 3rem;
                            margin-bottom: 1rem;
                        "
                    ></i>

                    <p style="
                        font-size: 1.2rem;
                        font-weight: 600;
                    ">
                        Não foi possível carregar os produtos.
                    </p>
                </div>
            `;
        }
    }


    // ========================================================
    // CARREGAR CUPONS DO FIREBASE
    // ========================================================

    let coupons = [];

    try {

        const cuponsSnap =
            await db.collection("cupons").get();

        coupons = cuponsSnap.docs.map(doc => ({
            docId: doc.id,
            ...doc.data()
        }));

    } catch (e) {

        console.error(
            "Erro ao carregar cupons do Firebase:",
            e
        );
    }


    // ========================================================
    // CONFIGURAÇÃO DA RETIRADA
    // ========================================================

    const configurarRetirada = () => {

        const pickupDateInput =
            document.getElementById("pickup-date");

        if (pickupDateInput) {

            const hoje = new Date();

            pickupDateInput.min =
                hoje.toISOString().split("T")[0];
        }


        const pickupTimeSelect =
            document.getElementById("pickup-time");

        if (!pickupTimeSelect) return;


        const [hIni, mIni] =
            CONFIG_RETIRADA.horaInicio
                .split(":")
                .map(Number);

        const [hFim, mFim] =
            CONFIG_RETIRADA.horaFim
                .split(":")
                .map(Number);


        const inicioMin =
            hIni * 60 + mIni;

        const fimMin =
            hFim * 60 + mFim;

        const passo =
            CONFIG_RETIRADA.intervalo || 60;


        let opcoes = `
            <option value="" disabled selected>
                Selecione
            </option>
        `;


        for (
            let m = inicioMin;
            m <= fimMin;
            m += passo
        ) {

            const h =
                String(Math.floor(m / 60))
                    .padStart(2, "0");

            const min =
                String(m % 60)
                    .padStart(2, "0");


            opcoes += `
                <option value="${h}:${min}">
                    ${h}:${min}
                </option>
            `;
        }


        pickupTimeSelect.innerHTML =
            opcoes;
    };


    // ========================================================
    // CARREGAR CONFIGURAÇÕES DO FIREBASE
    // ========================================================

    try {
        const configSnap = await db
            .collection("configuracoes")
            .doc("geral")
            .get();

        if (configSnap.exists) {
            const config = configSnap.data();

            // WhatsApp
            if (config.whatsapp) {
                NUMERO_WHATSAPP = config.whatsapp;
            }

            // Horários de retirada
            if (config.retirada) {
                CONFIG_RETIRADA = {
                    dias: Array.isArray(config.retirada.dias)
                        ? config.retirada.dias
                        : [],

                    horaInicio:
                        config.retirada.horaInicio ||
                        "08:00",

                    horaFim:
                        config.retirada.horaFim ||
                        "18:00",

                    intervalo:
                        Number(config.retirada.intervalo) ||
                        60
                };
            }
        }

    } catch (e) {
        console.error(
            "Erro ao carregar configurações do Firebase:",
            e
        );
    }


    configurarRetirada();


    // ========================================================
    // ESTADO DA APLICAÇÃO
    // ========================================================

    let carrinho = [];

    let tipoEntrega = "delivery";

    let appliedCoupon = null;

    let categoriaAtiva = "all";

    let termoBusca = "";


    // ========================================================
    // FUNÇÕES AUXILIARES
    // ========================================================

    const formatarMoeda = (valor) => {

        return Number(valor || 0).toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );
    };


    const getScrollbarWidth = () => {

        return window.innerWidth -
            document.documentElement.clientWidth;
    };


    const lockScroll = () => {

        document.body.style.paddingRight =
            `${getScrollbarWidth()}px`;

        document.body.classList.add("no-scroll");
    };


    const unlockScroll = () => {

        document.body.style.paddingRight = "";

        document.body.classList.remove("no-scroll");
    };


    // ========================================================
    // CARRINHO
    // ========================================================

    const abrirCarrinho = () => {

        cartSidebar.classList.add("show");

        cartOverlay.classList.add("show");

        lockScroll();
    };


    const fecharCarrinho = () => {

        cartSidebar.classList.remove("show");

        cartOverlay.classList.remove("show");

        unlockScroll();
    };


    // ========================================================
    // ANIMAÇÃO DO PRODUTO PARA O CARRINHO
    // ========================================================

    const animacaoVoarParaCarrinho = (productCard) => {

        if (!productCard) return;

        const productImg =
            productCard.querySelector(".product-img");

        if (!productImg) return;

        const imgRect =
            productImg.getBoundingClientRect();

        const cartRect =
            cartIcon.getBoundingClientRect();

        const flyingImg =
            document.createElement("img");

        flyingImg.src =
            productImg.src;

        flyingImg.classList.add(
            "product-image-fly"
        );

        flyingImg.style.left =
            `${imgRect.left}px`;

        flyingImg.style.top =
            `${imgRect.top}px`;

        flyingImg.style.width =
            `${imgRect.width}px`;

        flyingImg.style.height =
            `${imgRect.height}px`;

        document.body.appendChild(
            flyingImg
        );


        requestAnimationFrame(() => {

            flyingImg.style.left =
                `${cartRect.left + cartRect.width / 2}px`;

            flyingImg.style.top =
                `${cartRect.top + cartRect.height / 2}px`;

            flyingImg.style.width =
                "0px";

            flyingImg.style.height =
                "0px";

            flyingImg.style.opacity =
                "0";
        });


        flyingImg.addEventListener(
            "transitionend",
            () => flyingImg.remove()
        );
    };


    // ========================================================
    // MODAL DE PRODUTO
    // ========================================================

    const atualizarImagemModal = () => {

        const imagem =
            document.getElementById(
                "modalProductImage"
            );

        if (!imagem || !produtoModalAtual)
            return;


        const imagens =
            produtoModalAtual.imagem || [];


        if (!imagens.length) {

            imagem.src = "";

            imagem.alt =
                produtoModalAtual.nome || "";

            return;
        }


        if (modalImagemAtual < 0)
            modalImagemAtual =
                imagens.length - 1;


        if (modalImagemAtual >= imagens.length)
            modalImagemAtual = 0;


        imagem.src =
            imagens[modalImagemAtual];

        imagem.alt =
            produtoModalAtual.nome || "";
    };


    const atualizarBotoesGaleria = () => {

        const imagens =
            produtoModalAtual?.imagem || [];


        const botoes =
            document.querySelectorAll(
                ".ProductGalleryArrow"
            );


        botoes.forEach(botao => {

            botao.style.display =
                imagens.length > 1
                    ? ""
                    : "none";
        });
    };


    const abrirModalProduto = (produtoId) => {

        const produto =
            produtos.find(
                p => Number(p.id) === Number(produtoId)
            );


        if (!produto) {

            console.error(
                "Produto não encontrado:",
                produtoId
            );

            return;
        }


        produtoModalAtual =
            produto;

        modalImagemAtual = 0;


        // ----------------------------------------------------
        // TÍTULO
        // ----------------------------------------------------

        document.getElementById("modalProductBrand").textContent =
            produto.marca || "";

        const title =
            document.getElementById(
                "modalProductTitle"
            );

        if (title)
            title.textContent =
                produto.nome;


        // ----------------------------------------------------
        // PREÇO
        // ----------------------------------------------------

        const price =
            document.getElementById(
                "modalProductPrice"
            );

        if (price)
            price.textContent =
                formatarMoeda(produto.preco);


        // ----------------------------------------------------
        // PARCELAMENTO
        // ----------------------------------------------------

        const installment =
            document.getElementById(
                "modalProductInstallment"
            );


        if (installment) {

            if (
                produto.preco10x &&
                produto.preco10x > 0
            ) {

                const valorParcela =
                    produto.preco10x / 10;

                installment.textContent =
                    `10x de ${formatarMoeda(valorParcela)}`;
            }

            else {

                installment.textContent =
                    "";
            }
        }


        // ----------------------------------------------------
        // DESCRIÇÃO
        // ----------------------------------------------------

        const description =
            document.getElementById(
                "modalProductDescription"
            );


        if (description) {

            description.textContent =
                produto.descricaoLonga ||
                produto.descricao ||
                "";
        }


        // ----------------------------------------------------
        // ESPECIFICAÇÕES
        // ----------------------------------------------------

        const specs =
            document.getElementById(
                "modalProductSpecs"
            );


        if (specs) {

            specs.innerHTML =
                "";


            if (
                Array.isArray(
                    produto.especificacoes
                )
            ) {

                produto.especificacoes
                    .forEach(especificacao => {

                        const li =
                            document.createElement("li");

                        li.textContent =
                            especificacao;

                        specs.appendChild(li);
                    });
            }
        }


        // ----------------------------------------------------
        // IMAGEM
        // ----------------------------------------------------

        atualizarImagemModal();

        atualizarBotoesGaleria();


        // ----------------------------------------------------
        // ABRIR
        // ----------------------------------------------------

        const modal =
            document.getElementById(
                "ProductModal"
            );


        if (modal) {

            modal.classList.add("active");

            lockScroll();
        }
    };


    const fecharModalProduto = () => {

        const modal =
            document.getElementById(
                "ProductModal"
            );


        if (modal)
            modal.classList.remove("active");


        produtoModalAtual =
            null;

        unlockScroll();
    };


    const imagemAnterior = () => {

        if (!produtoModalAtual)
            return;


        const imagens =
            produtoModalAtual.imagem || [];


        if (imagens.length <= 1)
            return;


        modalImagemAtual--;

        if (modalImagemAtual < 0)
            modalImagemAtual =
                imagens.length - 1;


        atualizarImagemModal();
    };


    const proximaImagem = () => {

        if (!produtoModalAtual)
            return;


        const imagens =
            produtoModalAtual.imagem || [];


        if (imagens.length <= 1)
            return;


        modalImagemAtual++;

        if (
            modalImagemAtual >=
            imagens.length
        )
            modalImagemAtual = 0;


        atualizarImagemModal();
    };


    // ========================================================
    // DISPONIBILIZAR FUNÇÕES DO MODAL PARA O HTML
    // ========================================================

    window.openProductModal =
        abrirModalProduto;

    window.closeProductModal =
        fecharModalProduto;

    window.prevModalImage =
        imagemAnterior;

    window.nextModalImage =
        proximaImagem;


    // ========================================================
    // CLIQUE FORA DO MODAL
    // ========================================================

    const productModal =
        document.getElementById(
            "ProductModal"
        );


    if (productModal) {

        productModal.addEventListener(
            "click",
            (event) => {

                if (
                    event.target ===
                    productModal
                ) {

                    fecharModalProduto();
                }
            }
        );
    }


    // ========================================================
    // FILTRAR E MOSTRAR PRODUTOS
    // ========================================================

    const filtrarEMostrarProdutos = () => {

        let produtosFiltrados =
            [...produtos];


        // ----------------------------------------------------
        // FILTRO DE CATEGORIA
        // ----------------------------------------------------

        if (
            categoriaAtiva !==
            "all"
        ) {

            produtosFiltrados =
                produtosFiltrados.filter(
                    produto =>
                        produto.categoria ===
                        categoriaAtiva
                );
        }


        // ----------------------------------------------------
        // FILTRO DE BUSCA
        // ----------------------------------------------------

        if (
            termoBusca.trim() !== ""
        ) {

            const termo =
                termoBusca
                    .toLowerCase()
                    .trim();


            produtosFiltrados =
                produtosFiltrados.filter(
                    produto =>

                        (
                            produto.nome ||
                            ""
                        )
                            .toLowerCase()
                            .includes(termo)

                        ||

                        (
                            produto.descricao ||
                            ""
                        )
                            .toLowerCase()
                            .includes(termo)

                        ||

                        (
                            produto.marca ||
                            ""
                        )
                            .toLowerCase()
                            .includes(termo)
                );
        }


        // ----------------------------------------------------
        // NENHUM PRODUTO
        // ----------------------------------------------------

        if (
            produtosFiltrados.length === 0
        ) {

            productsContainer.innerHTML = `
                <div style="
                    grid-column: 1 / -1;
                    text-align: center;
                    padding: 3rem;
                    color: #999;
                ">

                    <i
                        class="fa-solid fa-box-open"
                        style="
                            font-size: 3rem;
                            margin-bottom: 1rem;
                        "
                    ></i>

                    <p style="
                        font-size: 1.2rem;
                        font-weight: 600;
                    ">
                        Nenhum produto encontrado
                    </p>

                </div>
            `;

            return;
        }


        // ----------------------------------------------------
        // RENDERIZAÇÃO
        // ----------------------------------------------------

        productsContainer.innerHTML =
            produtosFiltrados
                .map(p => {

                    const imagemPrincipal =
                        p.imagem?.[0] || "";

                    // ====================================================
                    // OFERTA
                    // ====================================================
                    // Durante o teste, estamos forçando a oferta como true.
                    // Depois basta remover o "|| true" e usar apenas:
                    // const emOferta = p.offer === true;

                    const emOferta =
                        p.offer === true;

                    const ofertaHTML = emOferta
                        ? `
                    <span class="product-offer">
                        EM OFERTA
                    </span>
                `
                        : "";


                    return `
                <div
                    class="product-card ${emOferta ? "has-offer" : ""}"
                    data-id="${p.id}"
                >

                    <div class="product-image-container">

                        ${ofertaHTML}

                        <img
                            class="product-img"
                            src="${imagemPrincipal}"
                            alt="${p.nome}"
                        >

                    </div>


                    <div class="product-info">

                        <h3 class="product-name">
                            ${p.nome}
                        </h3>

                        <p class="product-description">
                            ${p.descricao}
                        </p>

                        <p class="product-price ${emOferta ? "product-price-offer" : ""}">
                            ${formatarMoeda(p.preco)}
                        </p>

                        <button
                            class="product-button"
                        >
                            Comprar
                        </button>

                    </div>

                </div>
            `;
                })
                .join("");
    };


    // ========================================================
    // ADICIONAR AO CARRINHO
    // ========================================================

    const adicionarAoCarrinho = (
        produtoId,
        productCard = null
    ) => {

        if (productCard)
            animacaoVoarParaCarrinho(
                productCard
            );


        const produto =
            produtos.find(
                p =>
                    Number(p.id) ===
                    Number(produtoId)
            );


        if (!produto)
            return;


        const itemNoCarrinho =
            carrinho.find(
                item =>
                    Number(item.id) ===
                    Number(produtoId)
            );


        if (itemNoCarrinho) {

            itemNoCarrinho.quantidade++;
        }

        else {

            carrinho.push({
                ...produto,
                quantidade: 1
            });
        }


        atualizarCarrinho();
    };


    // ========================================================
    // ADICIONAR PRODUTO DO MODAL
    // ========================================================

    const comprarProdutoModal = () => {

        if (!produtoModalAtual)
            return;


        adicionarAoCarrinho(
            produtoModalAtual.id
        );


        fecharModalProduto();

    };


    const modalBuyBtn =
        document.getElementById(
            "modalBuyBtn"
        );


    if (modalBuyBtn) {

        modalBuyBtn.addEventListener(
            "click",
            comprarProdutoModal
        );
    }


    // ========================================================
    // ALTERAR QUANTIDADE
    // ========================================================

    const alterarQuantidade = (
        produtoId,
        acao
    ) => {

        const item =
            carrinho.find(
                i =>
                    Number(i.id) ===
                    Number(produtoId)
            );


        if (!item)
            return;


        if (
            acao === "aumentar"
        ) {

            item.quantidade++;
        }


        else if (
            acao === "diminuir"
        ) {

            item.quantidade--;


            if (
                item.quantidade <= 0
            ) {

                carrinho =
                    carrinho.filter(
                        i =>
                            Number(i.id) !==
                            Number(produtoId)
                    );
            }
        }


        atualizarCarrinho();
    };


    // ========================================================
    // ATUALIZAR CARRINHO
    // ========================================================

    const atualizarCarrinho = () => {

        if (
            carrinho.length === 0
        ) {

            cartBody.innerHTML = `
                <div class="cart-empty">

                    <i class="fa-solid fa-box-open"></i>

                    <p>
                        Seu carrinho está vazio.
                    </p>

                </div>
            `;
        }

        else {

            cartBody.innerHTML =
                carrinho
                    .map(item => {

                        const imagem =
                            item.imagem?.[0] || "";


                        return `
                            <div
                                class="cart-item"
                                data-id="${item.id}"
                            >

                                <img
                                    src="${imagem}"
                                    alt="${item.nome}"
                                    class="cart-item-img"
                                >

                                <div class="cart-item-info">

                                    <h4 class="cart-item-name">
                                        ${item.nome}
                                    </h4>

                                    <p class="cart-item-price">
                                        ${formatarMoeda(item.preco)}
                                    </p>

                                    <div class="cart-item-controls">

                                        <button
                                            class="quantity-btn"
                                            data-action="diminuir"
                                        >
                                            -
                                        </button>

                                        <span class="quantity">
                                            ${item.quantidade}
                                        </span>

                                        <button
                                            class="quantity-btn"
                                            data-action="aumentar"
                                        >
                                            +
                                        </button>

                                    </div>

                                </div>

                                <button
                                    class="remove-item-btn"
                                >
                                    &times;
                                </button>

                            </div>
                        `;
                    })
                    .join("");
        }


        // ----------------------------------------------------
        // SUBTOTAL
        // ----------------------------------------------------

        const subtotal =
            carrinho.reduce(
                (acc, item) =>
                    acc +
                    (
                        Number(item.preco) *
                        item.quantidade
                    ),
                0
            );


        // ----------------------------------------------------
        // VALOR MÍNIMO DO CUPOM
        // ----------------------------------------------------

        if (
            appliedCoupon &&
            appliedCoupon.valorMinimo &&
            subtotal <
            appliedCoupon.valorMinimo
        ) {

            appliedCoupon =
                null;

            couponFeedback.textContent =
                "Cupom removido: o pedido não atinge mais o valor mínimo exigido.";

            couponFeedback.classList.remove(
                "success"
            );

            couponFeedback.classList.add(
                "error"
            );
        }


        // ----------------------------------------------------
        // DESCONTO
        // ----------------------------------------------------

        const discountAmount =
            calcularDesconto(
                subtotal
            );


        const total =
            subtotal -
            discountAmount;


        subtotalElem.textContent =
            formatarMoeda(
                subtotal
            );


        if (
            discountAmount > 0
        ) {

            cartDiscountElem.textContent =
                `- ${formatarMoeda(discountAmount)}`;

            discountLineElem.style.display =
                "flex";
        }

        else {

            discountLineElem.style.display =
                "none";
        }


        totalElem.textContent =
            formatarMoeda(total);


        // ----------------------------------------------------
        // BADGE
        // ----------------------------------------------------

        cartBadge.textContent =
            carrinho.reduce(
                (acc, item) =>
                    acc +
                    item.quantidade,
                0
            );


        // ----------------------------------------------------
        // BOTÃO FINALIZAR
        // ----------------------------------------------------

        finishOrderBtn.disabled =
            carrinho.length === 0;


        // ----------------------------------------------------
        // BANNER MOBILE
        // ----------------------------------------------------

        if (
            carrinho.length > 0 &&
            window.innerWidth <= 768
        ) {

            bannerTotalElem.textContent =
                formatarMoeda(total);

            viewCartBanner.classList.add(
                "show"
            );
        }

        else {

            viewCartBanner.classList.remove(
                "show"
            );
        }
    };


    // ========================================================
    // CALCULAR DESCONTO
    // ========================================================

    const calcularDesconto = (
        subtotal
    ) => {

        if (!appliedCoupon)
            return 0;


        if (
            appliedCoupon.tipo ===
            "fixo"
        ) {

            return Math.min(
                Number(appliedCoupon.valor),
                subtotal
            );
        }


        return (
            subtotal *
            (
                Number(
                    appliedCoupon.valor
                ) / 100
            )
        );
    };


    // ========================================================
    // APLICAR CUPOM
    // ========================================================

    const applyCoupon = () => {

        const code =
            couponInput.value
                .trim()
                .toUpperCase();


        const subtotal =
            carrinho.reduce(
                (acc, item) =>
                    acc +
                    (
                        item.preco *
                        item.quantidade
                    ),
                0
            );


        const foundCoupon =
            coupons.find(
                c =>
                    c.codigo ===
                    code
            );


        couponFeedback.classList.remove(
            "success",
            "error"
        );


        if (!foundCoupon) {

            appliedCoupon = null;

            couponFeedback.textContent =
                "Cupom inválido.";

            couponFeedback.classList.add(
                "error"
            );
        }

        else if (
            foundCoupon.ativo === false
        ) {

            appliedCoupon = null;

            couponFeedback.textContent =
                "Este cupom não está mais disponível.";

            couponFeedback.classList.add(
                "error"
            );
        }

        else if (
            foundCoupon.validade &&
            new Date(
                `${foundCoupon.validade}T23:59:59`
            ) < new Date()
        ) {

            appliedCoupon = null;

            couponFeedback.textContent =
                "Este cupom expirou.";

            couponFeedback.classList.add(
                "error"
            );
        }

        else if (
            foundCoupon.valorMinimo &&
            subtotal <
            foundCoupon.valorMinimo
        ) {

            appliedCoupon = null;

            couponFeedback.textContent =
                `Pedido mínimo de ${formatarMoeda(
                    foundCoupon.valorMinimo
                )} para usar este cupom.`;

            couponFeedback.classList.add(
                "error"
            );
        }

        else {

            appliedCoupon =
                foundCoupon;

            couponFeedback.textContent =
                "Cupom aplicado!";

            couponFeedback.classList.add(
                "success"
            );
        }


        atualizarCarrinho();
    };


    // ========================================================
    // FINALIZAR PEDIDO
    // ========================================================

    const finalizarPedido = () => {

        let valid = true;

        let fieldsToValidate = [];


        if (
            tipoEntrega ===
            "delivery"
        ) {

            fieldsToValidate = [
                "delivery-name",
                "delivery-phone",
                "delivery-cep",
                "delivery-address"
            ];
        }

        else {

            fieldsToValidate = [
                "pickup-name",
                "pickup-date",
                "pickup-time"
            ];
        }


        // ----------------------------------------------------
        // VALIDAR DIA DE RETIRADA
        // ----------------------------------------------------

        if (
            tipoEntrega ===
            "pickup"
        ) {

            const dataInput =
                document.getElementById(
                    "pickup-date"
                );


            if (
                dataInput.value
            ) {

                const [
                    ano,
                    mes,
                    dia
                ] =
                    dataInput.value
                        .split("-")
                        .map(Number);


                const diaSemana =
                    new Date(
                        ano,
                        mes - 1,
                        dia
                    ).getDay();


                if (
                    !CONFIG_RETIRADA.dias.includes(
                        diaSemana
                    )
                ) {

                    dataInput.classList.add(
                        "error"
                    );

                    alert(
                        "A loja não realiza retiradas no dia selecionado. Escolha outra data."
                    );

                    return;
                }
            }
        }


        // ----------------------------------------------------
        // VALIDAR CAMPOS
        // ----------------------------------------------------

        fieldsToValidate.forEach(
            id => {

                const el =
                    document.getElementById(
                        id
                    );


                let isFieldValid =
                    el.value.trim() !== "";


                if (
                    id.includes("name") &&
                    isFieldValid
                ) {

                    if (
                        el.value
                            .trim()
                            .split(" ")
                            .filter(
                                word =>
                                    word
                            )
                            .length < 2
                    ) {

                        isFieldValid =
                            false;
                    }
                }


                if (!isFieldValid) {

                    el.classList.add(
                        "error"
                    );

                    valid = false;
                }

                else {

                    el.classList.remove(
                        "error"
                    );
                }
            }
        );


        if (!valid) {

            alert(
                "Por favor, preencha todos os campos obrigatórios marcados em vermelho."
            );

            return;
        }


        // ----------------------------------------------------
        // MONTAR PEDIDO
        // ----------------------------------------------------

        const itensPedido =
            carrinho
                .map(
                    item =>
                        `  - ${item.quantidade}x ${item.nome}`
                )
                .join("\n");


        const subtotal =
            carrinho.reduce(
                (acc, item) =>
                    acc +
                    (
                        item.preco *
                        item.quantidade
                    ),
                0
            );


        const discountAmount =
            calcularDesconto(
                subtotal
            );


        let cupomInfo = "";


        if (appliedCoupon) {

            cupomInfo =
                `\n*Cupom Aplicado:* ${appliedCoupon.codigo} (${formatarMoeda(
                    discountAmount
                )})`;
        }


        const total =
            subtotal -
            discountAmount;


        let mensagem =
            `*-- NOVO PEDIDO CUTELARIA PETS --*\n\n` +
            `*Itens:*\n${itensPedido}\n\n` +
            `*Subtotal:* ${formatarMoeda(subtotal)}` +
            `${cupomInfo}\n` +
            `*Total:* ${formatarMoeda(total)}\n\n` +
            `-------------------------\n\n`;


        // ----------------------------------------------------
        // ENTREGA
        // ----------------------------------------------------

        if (
            tipoEntrega ===
            "delivery"
        ) {

            const nome =
                document.getElementById(
                    "delivery-name"
                ).value;


            const phone =
                document.getElementById(
                    "delivery-phone"
                ).value;


            const address =
                document.getElementById(
                    "delivery-address"
                ).value;


            const paymentMethod =
                document.querySelector(
                    'input[name="payment"]:checked'
                ).value;


            let paymentInfo =
                `*Forma de Pagamento:* ${paymentMethod}`;


            if (
                paymentMethod ===
                "Dinheiro"
            ) {

                const troco =
                    document.getElementById(
                        "troco-para"
                    ).value;


                paymentInfo +=
                    troco
                        ? ` (Troco para R$ ${troco})`
                        : " (Não precisa de troco)";
            }


            mensagem +=
                `*Tipo de Pedido:* Entrega\n\n` +
                `*Nome:* ${nome}\n` +
                `*Telefone:* ${phone}\n` +
                `*Endereço:* ${address}\n\n` +
                `${paymentInfo}`;
        }


        // ----------------------------------------------------
        // RETIRADA
        // ----------------------------------------------------

        else {

            const nome =
                document.getElementById(
                    "pickup-name"
                ).value;


            const dataInput =
                document.getElementById(
                    "pickup-date"
                ).value;


            const hora =
                document.getElementById(
                    "pickup-time"
                ).value;


            const [
                year,
                month,
                day
            ] =
                dataInput.split("-");


            const dataFormatada =
                `${day}/${month}/${year}`;


            mensagem +=
                `*Tipo de Pedido:* Retirada\n\n` +
                `*Nome para Retirada:* ${nome}\n` +
                `*Data Agendada:* ${dataFormatada}\n` +
                `*Hora Agendada:* ${hora}`;
        }


        // ----------------------------------------------------
        // WHATSAPP
        // ----------------------------------------------------

        const url =
            `https://wa.me/${NUMERO_WHATSAPP}?text=${encodeURIComponent(
                mensagem
            )}`;


        window.open(
            url,
            "_blank"
        );
    };


    // ========================================================
    // EVENTOS DO CARRINHO
    // ========================================================

    cartIcon.addEventListener(
        "click",
        abrirCarrinho
    );


    closeCartBtn.addEventListener(
        "click",
        fecharCarrinho
    );


    cartOverlay.addEventListener(
        "click",
        fecharCarrinho
    );


    applyCouponBtn.addEventListener(
        "click",
        applyCoupon
    );


    finishOrderBtn.addEventListener(
        "click",
        finalizarPedido
    );


    viewCartBannerBtn.addEventListener(
        "click",
        abrirCarrinho
    );


    // ========================================================
    // EVENTOS DAS CATEGORIAS
    // ========================================================

    categoryBtns.forEach(
        btn => {

            btn.addEventListener(
                "click",
                () => {

                    categoryBtns.forEach(
                        b =>
                            b.classList.remove(
                                "active"
                            )
                    );


                    btn.classList.add(
                        "active"
                    );


                    categoriaAtiva =
                        btn.dataset.category;


                    filtrarEMostrarProdutos();
                }
            );
        }
    );


    // ========================================================
    // BUSCA
    // ========================================================

    searchInput.addEventListener(
        "input",
        event => {

            termoBusca =
                event.target.value;


            filtrarEMostrarProdutos();
        }
    );


    // ========================================================
    // CLIQUES NOS PRODUTOS
    // ========================================================

    productsContainer.addEventListener(
        "click",
        event => {

            const productCard =
                event.target.closest(
                    ".product-card"
                );


            if (!productCard)
                return;


            const produtoId =
                Number(
                    productCard.dataset.id
                );


            // ------------------------------------------------
            // BOTÃO COMPRAR
            // ------------------------------------------------

            if (
                event.target.closest(
                    ".product-button"
                )
            ) {

                adicionarAoCarrinho(
                    produtoId,
                    productCard
                );

                return;
            }


            // ------------------------------------------------
            // CLIQUE NO CARD
            // ------------------------------------------------

            abrirModalProduto(
                produtoId
            );
        }
    );


    // ========================================================
    // CLIQUES NO CARRINHO
    // ========================================================

    cartBody.addEventListener(
        "click",
        event => {

            const cartItem =
                event.target.closest(
                    ".cart-item"
                );


            if (!cartItem)
                return;


            const produtoId =
                Number(
                    cartItem.dataset.id
                );


            if (
                event.target.matches(
                    ".quantity-btn"
                )
            ) {

                alterarQuantidade(
                    produtoId,
                    event.target.dataset.action
                );
            }


            if (
                event.target.matches(
                    ".remove-item-btn"
                )
            ) {

                carrinho =
                    carrinho.filter(
                        item =>
                            Number(item.id) !==
                            Number(produtoId)
                    );


                atualizarCarrinho();
            }
        }
    );


    // ========================================================
    // ENTREGA / RETIRADA
    // ========================================================

    deliveryToggleBtns.forEach(
        btn => {

            btn.addEventListener(
                "click",
                () => {

                    deliveryToggleBtns.forEach(
                        b =>
                            b.classList.remove(
                                "active"
                            )
                    );


                    btn.classList.add(
                        "active"
                    );


                    tipoEntrega =
                        btn.dataset.option;


                    if (
                        tipoEntrega ===
                        "delivery"
                    ) {

                        deliveryForm.style.display =
                            "block";

                        pickupForm.style.display =
                            "none";
                    }

                    else {

                        deliveryForm.style.display =
                            "none";

                        pickupForm.style.display =
                            "block";
                    }
                }
            );
        }
    );


    // ========================================================
    // FORMA DE PAGAMENTO
    // ========================================================

    document
        .querySelectorAll(
            'input[name="payment"]'
        )
        .forEach(
            radio => {

                radio.addEventListener(
                    "change",
                    event => {

                        trocoContainer.style.display =
                            event.target.value ===
                                "Dinheiro"
                                ? "block"
                                : "none";


                        document
                            .querySelectorAll(
                                ".payment-option"
                            )
                            .forEach(
                                label =>
                                    label.classList.remove(
                                        "selected"
                                    )
                            );


                        event.target
                            .closest(
                                ".payment-option"
                            )
                            .classList.add(
                                "selected"
                            );
                    }
                );
            }
        );


    // ========================================================
    // REMOVER ERRO DOS CAMPOS
    // ========================================================

    document
        .querySelectorAll(
            "#delivery-form-container input[required], " +
            "#delivery-form-container textarea[required], " +
            "#pickup-form-container input[required], " +
            "#pickup-form-container select[required]"
        )
        .forEach(
            input => {

                input.addEventListener(
                    "input",
                    () => {

                        if (
                            input.value.trim() !== ""
                        ) {

                            input.classList.remove(
                                "error"
                            );
                        }
                    }
                );
            }
        );


    // ========================================================
    // FECHAR MODAL COM ESC
    // ========================================================

    document.addEventListener(
        "keydown",
        event => {

            if (
                event.key ===
                "Escape"
            ) {

                fecharModalProduto();
            }
        }
    );


    // ========================================================
    // INICIALIZAÇÃO
    // ========================================================

    filtrarEMostrarProdutos();

    atualizarCarrinho();

    // ============================================================
    // HEADER FIXO AO ROLAR A PÁGINA
    // ============================================================

    const header = document.querySelector(".hero-header");

    if (header) {

        const headerOffset = header.offsetTop;

        window.addEventListener("scroll", () => {

            if (window.scrollY > headerOffset) {
                header.classList.add("header-fixed");
            } else {
                header.classList.remove("header-fixed");
            }

        });

    }

});