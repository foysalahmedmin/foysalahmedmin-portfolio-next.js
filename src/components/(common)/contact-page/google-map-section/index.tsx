const GoogleMapSection = () => {
    return (
      <section className="bg-muted h-[500px] w-full">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d116834.00977788!2d90.349284!3d23.7808875!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755b8b087026b81%3A0x8fa5690c31864291!2sDhaka!5e0!3m2!1sen!2sbd!4v1711234567890!5m2!1sen!2sbd"
          width="100%"
          height="100%"
          style={{
            border: 0,
            filter: "grayscale(100%) invert(90%) contrast(90%)",
          }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </section>
    );
  };
  
  export default GoogleMapSection;
  
