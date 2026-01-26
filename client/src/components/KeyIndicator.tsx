import styled from 'styled-components';

interface KeyIndicatorProps {
    keys: string | string[];
}

const StyledKeyIndicator = styled.span`
    position: absolute;
    top: 3px;
    right: 3px;
    font-size: 9px;
    line-height: .7;
    font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
    font-weight: bolder;
    color: rgba(161, 161, 170, 0.6);
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease-in-out;
    z-index: 10;
    border-radius: 0.125rem;
    outline: 1px solid rgba(55, 65, 81, 0.6);
    outline-offset: 1px;

    button:hover & {
        opacity: 1;
    }
`;

const KeyIndicator = ({ keys }: KeyIndicatorProps) => {
    const keyArray = Array.isArray(keys) ? keys : [keys];
    const displayText = keyArray.join("");

    return (
        <StyledKeyIndicator className="key-indicator">
            {displayText}
        </StyledKeyIndicator>
    );
};

export default KeyIndicator;