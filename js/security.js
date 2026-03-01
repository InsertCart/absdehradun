(() => {
    const RATE_KEY = "abs_form_rate_limit_v1";
    const RATE_WINDOW_MS = 30 * 60 * 1000;
    const RATE_MAX_SUBMISSIONS = 3;
    const MIN_FILL_MS = 3500;

    function decodeChars(codes) {
        return codes.map((code) => String.fromCharCode(code)).join("");
    }

    function getContactData() {
        return {
            email: decodeChars([114, 101, 104, 97, 110, 113, 117, 114, 101, 115, 104, 105, 48, 49, 48, 49, 64, 103, 109, 97, 105, 108, 46, 99, 111, 109]),
            phoneMainRaw: decodeChars([43, 57, 49, 57, 55, 53, 57, 48, 55, 56, 51, 50, 51]),
            phoneMainDisplay: decodeChars([43, 57, 49, 32, 57, 55, 53, 57, 48, 32, 55, 56, 51, 50, 51]),
            phoneAltRaw: decodeChars([43, 57, 49, 56, 50, 55, 51, 48, 48, 49, 54, 56, 56]),
            phoneAltDisplay: decodeChars([43, 57, 49, 32, 56, 50, 55, 51, 48, 32, 48, 49, 54, 56, 56]),
            whatsapp: decodeChars([56, 50, 55, 51, 48, 48, 49, 54, 56, 56]),
        };
    }

    function applyContactProtection() {
        const data = getContactData();
        const comboPhones = `${data.phoneMainDisplay}, ${data.phoneAltDisplay}`;

        document.querySelectorAll(".js-email-text").forEach((el) => {
            el.textContent = data.email;
        });

        document.querySelectorAll(".js-email-link").forEach((el) => {
            el.setAttribute("href", `mailto:${data.email}`);
            el.textContent = data.email;
        });

        document.querySelectorAll(".js-phone-main-link").forEach((el) => {
            el.setAttribute("href", `tel:${data.phoneMainRaw}`);
            if (!el.dataset.keepText) {
                el.textContent = data.phoneMainDisplay;
            }
        });

        document.querySelectorAll(".js-phone-alt-link").forEach((el) => {
            el.setAttribute("href", `tel:${data.phoneAltRaw}`);
            if (!el.dataset.keepText) {
                el.textContent = data.phoneAltDisplay;
            }
        });

        document.querySelectorAll(".js-phone-main-text").forEach((el) => {
            el.textContent = data.phoneMainDisplay;
        });

        document.querySelectorAll(".js-phone-combo-text").forEach((el) => {
            el.textContent = comboPhones;
        });

        document.querySelectorAll(".js-whatsapp-text").forEach((el) => {
            el.textContent = data.whatsapp;
        });
    }

    function readRateEntries() {
        try {
            const parsed = JSON.parse(localStorage.getItem(RATE_KEY) || "[]");
            if (!Array.isArray(parsed)) {
                return [];
            }
            const now = Date.now();
            return parsed.filter((value) => typeof value === "number" && now - value < RATE_WINDOW_MS);
        } catch (error) {
            return [];
        }
    }

    function writeRateEntries(entries) {
        try {
            localStorage.setItem(RATE_KEY, JSON.stringify(entries));
        } catch (error) {
            // Ignore storage exceptions.
        }
    }

    function setFormMessage(form, text, type) {
        let formMessage = form.querySelector("#formMessage");
        if (!formMessage) {
            formMessage = document.createElement("div");
            formMessage.id = "formMessage";
            formMessage.style.display = "none";
            formMessage.style.marginTop = "12px";
            formMessage.style.padding = "10px 12px";
            formMessage.style.fontSize = "12px";
            formMessage.style.lineHeight = "1.5";
            form.appendChild(formMessage);
        }

        formMessage.style.display = "block";
        if (type === "error") {
            formMessage.style.background = "#fee2e2";
            formMessage.style.color = "#991b1b";
        } else {
            formMessage.style.background = "#dcfce7";
            formMessage.style.color = "#166534";
        }
        formMessage.textContent = text;
    }

    function ensureHiddenField(form, name, type, value) {
        let field = form.querySelector(`input[name="${name}"]`);
        if (!field) {
            field = document.createElement("input");
            field.type = type;
            field.name = name;
            form.prepend(field);
        }
        field.type = type;
        field.name = name;
        field.value = value;
        return field;
    }

    function ensureHoneypotField(form) {
        let field = form.querySelector('input[name="_gotcha"]');
        if (!field) {
            field = document.createElement("input");
            form.prepend(field);
        }
        field.type = "text";
        field.name = "_gotcha";
        field.value = "";
        field.tabIndex = -1;
        field.autocomplete = "off";
        field.setAttribute("aria-hidden", "true");
        field.style.position = "absolute";
        field.style.left = "-5000px";
        field.style.top = "auto";
        field.style.width = "1px";
        field.style.height = "1px";
        field.style.opacity = "0";
        field.style.pointerEvents = "none";
        return field;
    }

    function initializeFormProtection() {
        document.querySelectorAll("form#contactForm").forEach((form) => {
            const startedAtField = ensureHiddenField(form, "form_started_at", "hidden", String(Date.now()));
            ensureHoneypotField(form);
            ensureHiddenField(form, "_subject", "hidden", "Website Inquiry - Achiever Building Solution");

            const nameInput = form.querySelector('[name="name"]');
            if (nameInput) {
                nameInput.setAttribute("minlength", "2");
                nameInput.setAttribute("maxlength", "80");
            }

            const phoneInput = form.querySelector('[name="phone"]');
            if (phoneInput) {
                phoneInput.setAttribute("inputmode", "tel");
                phoneInput.setAttribute("pattern", "[0-9+\\-\\s]{10,20}");
                phoneInput.setAttribute("maxlength", "20");
            }

            const interestInput = form.querySelector('[name="interest"]');
            if (interestInput) {
                interestInput.setAttribute("required", "required");
            }

            const messageInput = form.querySelector('[name="message"]');
            if (messageInput) {
                messageInput.setAttribute("minlength", "10");
                messageInput.setAttribute("maxlength", "1000");
            }

            form.addEventListener("reset", () => {
                setTimeout(() => {
                    startedAtField.value = String(Date.now());
                }, 0);
            });

            form.addEventListener(
                "submit",
                (event) => {
                    const now = Date.now();
                    const gotcha = form.querySelector('input[name="_gotcha"]');
                    if (gotcha && gotcha.value.trim() !== "") {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        setFormMessage(form, "Thank you! Your message has been sent successfully.", "success");
                        return;
                    }

                    const startedAt = Number(startedAtField.value || "0");
                    if (!startedAt || now - startedAt < MIN_FILL_MS) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        setFormMessage(form, "Please wait a few seconds before submitting the form.", "error");
                        return;
                    }

                    const messageValue = (form.querySelector('[name="message"]')?.value || "").trim();
                    if (/(https?:\/\/|www\.|bit\.ly\/|tinyurl\.com\/|t\.me\/)/i.test(messageValue)) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        setFormMessage(form, "Links are not allowed in the message. Please remove URLs and try again.", "error");
                        return;
                    }

                    const entries = readRateEntries();
                    if (entries.length >= RATE_MAX_SUBMISSIONS) {
                        event.preventDefault();
                        event.stopImmediatePropagation();
                        setFormMessage(form, "Too many submissions detected. Please try again after 30 minutes.", "error");
                        return;
                    }

                    entries.push(now);
                    writeRateEntries(entries);
                    startedAtField.value = String(now);
                },
                true
            );
        });
    }

    document.addEventListener("DOMContentLoaded", () => {
        applyContactProtection();
        initializeFormProtection();
    });
})();
