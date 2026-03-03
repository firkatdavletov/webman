import { FormEvent, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../auth/authService';

type FieldName = 'email' | 'password';

type FormValues = {
  email: string;
  password: string;
};

type FormErrors = Partial<Record<FieldName, string>>;

const emptyValues: FormValues = {
  email: '',
  password: '',
};

function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};

  if (!values.email.trim()) {
    errors.email = 'Укажите электронную почту.';
  }

  if (!values.password) {
    errors.password = 'Укажите пароль.';
  }

  return errors;
}

export function LoginPage() {
  const navigate = useNavigate();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [values, setValues] = useState<FormValues>(emptyValues);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const focusField = (field: FieldName) => {
    if (field === 'email') {
      emailRef.current?.focus();
      return;
    }

    passwordRef.current?.focus();
  };

  const handleChange = (field: FieldName, nextValue: string) => {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: nextValue,
    }));

    setErrors((currentErrors) => {
      if (!currentErrors[field]) {
        return currentErrors;
      }

      return {
        ...currentErrors,
        [field]: undefined,
      };
    });

    if (submitError) {
      setSubmitError('');
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const nextErrors = validate(values);

    if (nextErrors.email) {
      setErrors(nextErrors);
      focusField('email');
      return;
    }

    if (nextErrors.password) {
      setErrors(nextErrors);
      focusField('password');
      return;
    }

    setErrors({});
    setSubmitError('');
    setIsSubmitting(true);

    const result = await login(values.email.trim(), values.password);

    if (result.token) {
      navigate('/categories', { replace: true });
      return;
    }

    setSubmitError(result.error ?? 'Не удалось выполнить вход.');
    setIsSubmitting(false);
    focusField('email');
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-copy">
          <span className="auth-kicker">Webman CMS</span>
          <h1 id="login-title" className="auth-title">
            Вход в панель управления
          </h1>
          <p className="auth-description">Используйте электронную почту и пароль, чтобы войти в защищенную админ-панель.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field-label" htmlFor="email">
              Электронная почта
            </label>
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              className="field-input"
              autoComplete="email"
              value={values.email}
              onChange={(event) => handleChange('email', event.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email ? (
              <p id="email-error" className="field-error" role="alert">
                {errors.email}
              </p>
            ) : null}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="password">
              Пароль
            </label>
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type="password"
              className="field-input"
              autoComplete="current-password"
              value={values.password}
              onChange={(event) => handleChange('password', event.target.value)}
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password ? (
              <p id="password-error" className="field-error" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>

          {submitError ? (
            <p className="form-error" role="alert">
              {submitError}
            </p>
          ) : null}

          <button type="submit" className="submit-button" disabled={isSubmitting}>
            {isSubmitting ? 'Вход...' : 'Войти'}
          </button>
        </form>
      </section>
    </main>
  );
}
