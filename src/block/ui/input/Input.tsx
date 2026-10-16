import './input.css';

import type { InputType } from '../../../@types/Input.types';

const Input = ({ label = '', className= '', error = '', register, ...props }: InputType) => {
    return (
        <>
            <div className={`cmp-input ${className} ${error ? 'cmp-input--error' : ''}`}>
                {
                    label && <label className='cmp-input__label'> {label}</label>
                }
                <input className={`cmp-input__field`} type="text" {...register} {...props} />
                {
                    error && <p className='cmp-input__error'>{error}</p>
                }
            </div>
        </>
    )
}

export default Input;
