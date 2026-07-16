import { useCallback, useEffect, useState } from "react";

export type OverlayState = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  onOpenChange: (open: boolean) => void;
};

export const useOverlayState = (
  isOpenProp?: boolean,
  setIsOpenProp?: (open: boolean) => void
): OverlayState => {
  const [isOpen, setIsOpen] = useState(isOpenProp ?? false);

  const onOpen = useCallback(() => {
    setIsOpen(true);
    setIsOpenProp?.(true);
  }, [setIsOpenProp]);

  const onClose = useCallback(() => {
    setIsOpen(false);
    setIsOpenProp?.(false);
  }, [setIsOpenProp]);

  const onToggle = useCallback(() => {
    setIsOpen((current) => {
      const next = !current;
      setIsOpenProp?.(next);
      return next;
    });
  }, [setIsOpenProp]);

  const onOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      setIsOpenProp?.(open);
    },
    [setIsOpenProp]
  );

  useEffect(() => {
    if (typeof isOpenProp === "boolean") {
      setIsOpen(isOpenProp);
    }
  }, [isOpenProp]);

  return { isOpen, onOpen, onClose, onToggle, onOpenChange };
};
